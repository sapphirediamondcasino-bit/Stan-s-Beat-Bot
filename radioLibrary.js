'use strict';
/**
 * radioLibrary.js — put at src/services/radioLibrary.js (or next to cloud9Radio.js).
 *
 * Mirrors the approved radio library from Supabase Storage into the local audio/
 * folders, using the SAME layout the bot already reads:
 *     audio/cloud9/<artist folder>/<original filename>
 *     audio/segments/<character>/<original filename>
 * so cloud9Radio.js and voiceSegmentPlayer.js need no changes.
 *
 * Usage in index.js, after the client is ready:
 *     const { syncRadioLibrary } = require('./services/radioLibrary');
 *     await syncRadioLibrary();                       // on startup
 *     setInterval(syncRadioLibrary, 10 * 60 * 1000);  // and every 10 min
 *     // then: client.cloud9Radio._songPool = null; voiceSegmentPlayer.rescanAudioFiles();
 *
 * Env (server only, never committed): SUPABASE_URL, SUPABASE_SECRET_KEY
 * If they are missing the sync is skipped and the bot uses whatever is already on disk.
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logging/Logger'); // adjust the path to match where you place this file

const AUDIO_DIR = path.join(__dirname, '..', 'audio');
let client = null;
let running = false;

function getClient() {
  if (client) return client;
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return null;
  const { createClient } = require('@supabase/supabase-js');
  client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  return client;
}

async function download(sb, bucket, key, dest, expectedBytes) {
  if (fs.existsSync(dest) && (!expectedBytes || fs.statSync(dest).size === expectedBytes)) return false;
  const { data, error } = await sb.storage.from(bucket).download(key);
  if (error) throw new Error(`${key}: ${error.message}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest + '.part', Buffer.from(await data.arrayBuffer()));
  fs.renameSync(dest + '.part', dest); // never leave a half-written file for the player to open
  return true;
}

async function syncRadioLibrary() {
  const sb = getClient();
  if (!sb) return { skipped: true };
  if (running) return { skipped: true };
  running = true;
  let added = 0, failed = 0;
  try {
    const { data: tracks, error: tErr } = await sb
      .from('radio_tracks')
      .select('storage_bucket, storage_path, original_filename, radio_artists(folder)')
      .eq('status', 'approved').neq('source', 'submission');
    if (tErr) throw tErr;

    for (const t of tracks) {
      const folder = t.radio_artists?.folder;
      if (!folder || !t.original_filename) continue;
      try {
        if (await download(sb, t.storage_bucket, t.storage_path, path.join(AUDIO_DIR, 'cloud9', folder, t.original_filename))) added++;
      } catch (e) { failed++; logger.warn(`[RadioLibrary] ${e.message}`); }
    }

    const { data: segs, error: sErr } = await sb
      .from('radio_segments')
      .select('storage_bucket, storage_path, original_filename, character')
      .eq('enabled', true);
    if (sErr) throw sErr;

    for (const s of segs) {
      try {
        if (await download(sb, s.storage_bucket, s.storage_path, path.join(AUDIO_DIR, 'segments', s.character, s.original_filename))) added++;
      } catch (e) { failed++; logger.warn(`[RadioLibrary] ${e.message}`); }
    }

    if (added || failed) logger.info(`[RadioLibrary] Synced: ${added} new, ${failed} failed`);
    return { added, failed };
  } catch (e) {
    logger.error('[RadioLibrary] Sync failed:', e.message);
    return { error: e.message };
  } finally {
    running = false;
  }
}

module.exports = { syncRadioLibrary };
