#!/usr/bin/env node
'use strict';
/**
 * sync-audio.js — push the local audio/ folder up to Supabase (run on YOUR machine).
 *
 *   audio/cloud9/<artist_folder>/*.mp3|wav  ->  bucket radio-music    + radio_tracks
 *   audio/segments/<character>/*            ->  bucket radio-segments + radio_segments
 *
 * Needs (environment variables, never commit them):
 *   SUPABASE_URL          https://pcbxusgmjbixjaghvich.supabase.co
 *   SUPABASE_SECRET_KEY   the SECRET key (server-side only)
 *
 * Usage:  node tools/sync-audio.js [--dry-run] [--audio-dir ./audio]
 * Safe to re-run: unchanged files are skipped. Nothing is ever deleted.
 *
 * audio/artists.json is created on first run. Edit it to say which artists are
 * yours (is_owner) and which you manage under license (is_managed).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const dirIdx = args.indexOf('--audio-dir');
const AUDIO_DIR = path.resolve(dirIdx >= 0 ? args[dirIdx + 1] : path.join(__dirname, '..', 'audio'));

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY first.');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const MUSIC_EXT = /\.(mp3|wav)$/i;
const SEG_EXT = /\.(mp3|wav|ogg|m4a|mp4)$/i;
const safe = (s) => s.replace(/[^A-Za-z0-9._-]/g, '_');
const titleCase = (s) => s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function duration(file) {
  const r = spawnSync('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', file], { encoding: 'utf8' });
  try { return Math.round(parseFloat(JSON.parse(r.stdout).format.duration)) || null; } catch { return null; }
}

function segmentKind(name) {
  const n = name.toLowerCase();
  if (n.includes('greet') || n.includes('gretting')) return 'greeting';
  if (n.includes('intro')) return 'intro';
  if (n.includes('react')) return 'reaction';
  return 'other';
}

async function alreadyUploaded(bucket, key, size) {
  const dir = path.posix.dirname(key);
  const { data } = await sb.storage.from(bucket).list(dir, { search: path.posix.basename(key), limit: 5 });
  const hit = (data || []).find((o) => o.name === path.posix.basename(key));
  return !!hit && hit.metadata?.size === size;
}

async function upload(bucket, key, file) {
  const size = fs.statSync(file).size;
  if (await alreadyUploaded(bucket, key, size)) return 'skipped';
  if (DRY) return 'would upload';
  const { error } = await sb.storage.from(bucket).upload(key, fs.readFileSync(file), {
    upsert: true,
    contentType: /\.wav$/i.test(file) ? 'audio/wav' : 'audio/mpeg',
  });
  if (error) throw new Error(`${key}: ${error.message}`);
  return 'uploaded';
}

async function syncMusic() {
  const base = path.join(AUDIO_DIR, 'cloud9');
  if (!fs.existsSync(base)) return console.log('No audio/cloud9 folder — skipping music.');

  const cfgPath = path.join(AUDIO_DIR, 'artists.json');
  const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
  const folders = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  let wroteCfg = false;
  for (const f of folders) if (!cfg[f]) { cfg[f] = { name: titleCase(f), is_owner: false, is_managed: true }; wroteCfg = true; }
  if (wroteCfg && !DRY) fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

  for (const folder of folders) {
    const a = cfg[folder];
    let artistId = null;
    if (!DRY) {
      const { data, error } = await sb.from('radio_artists')
        .upsert({ name: a.name, folder, is_owner: !!a.is_owner, is_managed: !!a.is_managed }, { onConflict: 'name' })
        .select('id').single();
      if (error) throw error;
      artistId = data.id;
    }
    const files = fs.readdirSync(path.join(base, folder)).filter((x) => MUSIC_EXT.test(x));
    for (const file of files) {
      const full = path.join(base, folder, file);
      const key = `cloud9/${folder}/${safe(file)}`;
      const result = await upload('radio-music', key, full);
      if (!DRY) {
        const { error } = await sb.from('radio_tracks').upsert({
          artist_id: artistId,
          title: path.basename(file, path.extname(file)),
          storage_bucket: 'radio-music',
          storage_path: key,
          original_filename: file,
          duration_seconds: duration(full),
          source: a.is_owner ? 'owned' : 'licensed',
          status: 'approved',
        }, { onConflict: 'storage_bucket,storage_path' });
        if (error) throw error;
      }
      console.log(`[music] ${a.name} / ${file}: ${result}`);
    }
  }
}

async function syncSegments() {
  const base = path.join(AUDIO_DIR, 'segments');
  if (!fs.existsSync(base)) return console.log('No audio/segments folder — skipping segments.');
  const chars = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  for (const ch of chars) {
    for (const file of fs.readdirSync(path.join(base, ch)).filter((x) => SEG_EXT.test(x))) {
      const full = path.join(base, ch, file);
      const key = `${ch.toLowerCase()}/${safe(file)}`;
      const result = await upload('radio-segments', key, full);
      if (!DRY) {
        const { error } = await sb.from('radio_segments').upsert({
          character: ch.toLowerCase(),
          kind: segmentKind(file),
          storage_path: key,
          original_filename: file,
          duration_seconds: duration(full),
        }, { onConflict: 'storage_bucket,storage_path' });
        if (error) throw error;
      }
      console.log(`[segment] ${ch} / ${file}: ${result}`);
    }
  }
}

(async () => {
  console.log(`${DRY ? 'DRY RUN — ' : ''}Syncing ${AUDIO_DIR}`);
  await syncMusic();
  await syncSegments();
  console.log('Done.');
})().catch((e) => { console.error('Sync failed:', e.message); process.exit(1); });
