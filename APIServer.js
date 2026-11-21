'use strict';

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const axios  = require('axios');
const { spawn } = require('child_process');
const yts    = require('youtube-sr').default;
const logger = require('../logging/Logger');

// ─── Approved admin IDs ───────────────────────────────────────────────────────
const ADMIN_IDS = new Set([
    '523709000961753089',   // Stan (Owner / Kurrasch Systems)
    // Add staff IDs below:
    // '123456789012345678',
]);

function isAdmin(userId) {
    return ADMIN_IDS.has(String(userId));
}

// Who is really calling? Ask Discord to verify the Bearer token the site sends.
// The caller can no longer just claim an admin ID. Results are cached for 60s.
const _tokenCache = new Map();
async function discordUserId(req) {
    const h = (req.headers && req.headers.authorization) || '';
    if (!h.startsWith('Bearer ')) return null;
    const hit = _tokenCache.get(h);
    if (hit && Date.now() - hit.at < 60000) return hit.id;
    try {
        const r = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: h }, timeout: 8000
        });
        _tokenCache.set(h, { id: r.data.id, at: Date.now() });
        if (_tokenCache.size > 500) _tokenCache.delete(_tokenCache.keys().next().value);
        return r.data.id;
    } catch (e) {
        return null;
    }
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
    'https://stansbeatbot.online',
    'https://www.stansbeatbot.online',
    'http://stansbeatbot.online',
    'http://www.stansbeatbot.online',
    'http://localhost:3006',
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1:3006',
    'http://127.0.0.1:3000',
    'http://127.0.0.1',
];

function setCORSHeaders(req, res) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS, PATCH, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
}

function sendJSON(res, statusCode, data) {
    const body = JSON.stringify(data);
    res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
    res.end(body);
}

function getBody(req) {
    return new Promise(function(resolve, reject) {
        let data = '';
        req.on('data', function(chunk) { data += chunk; });
        req.on('end', function() {
            try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
        });
        req.on('error', reject);
    });
}

function matchRoute(method, url, routeMethod, pattern) {
    if (method !== routeMethod) return null;
    const urlPath = url.split('?')[0];
    const pp = pattern.split('/'), up = urlPath.split('/');
    if (pp.length !== up.length) return null;
    const params = {};
    for (let i = 0; i < pp.length; i++) {
        if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(up[i]);
        else if (pp[i] !== up[i]) return null;
    }
    return params;
}

function getQuery(url) {
    const query = {}, parts = url.split('?');
    if (parts[1]) parts[1].split('&').forEach(function(pair) {
        const kv = pair.split('=');
        if (kv[0]) query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return query;
}

// ─── Download helper (used by Cloud 9 submit) ─────────────────────────────────
function downloadUrl(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : require('http');
        lib.get(url, { timeout: 60000 }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return resolve(downloadUrl(res.headers.location));
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end',  () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

// ─── Shared audio resolver ────────────────────────────────────────────────────
const YTDLP_PATH   = path.join(__dirname, '..', '..', 'yt-dlp.exe');
const COOKIES_PATH = path.join(__dirname, '..', 'chromewebstore.google.com_cookies.txt');

function ytdlpGetUrl(videoUrl) {
    return new Promise(function(resolve, reject) {
        const args = [
            '--no-playlist',
            '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
            '--get-url',
            '--no-warnings',
        ];
        if (fs.existsSync(COOKIES_PATH)) args.push('--cookies', COOKIES_PATH);
        args.push(videoUrl);

        const proc = spawn(YTDLP_PATH, args, { windowsHide: true });
        let out = '', err = '';
        proc.stdout.on('data', function(d) { out += d.toString(); });
        proc.stderr.on('data', function(d) { err += d.toString(); });
        proc.on('close', function() {
            const url = out.trim().split('\n')[0].trim();
            if (url && url.startsWith('http')) resolve(url);
            else reject(new Error('yt-dlp returned no URL. ' + err.slice(0, 200)));
        });
        proc.on('error', function(e) { reject(new Error('yt-dlp spawn failed: ' + e.message)); });
        setTimeout(function() { try { proc.kill(); } catch(e) {} reject(new Error('yt-dlp timeout')); }, 25000);
    });
}

async function resolveAudio(input) {
    if (input.includes('googlevideo.com') || input.includes('videoplayback')) {
        throw new Error('Expired stream URL — pass a YouTube URL or search query instead');
    }
    let videoUrl = input;
    let title = input, artist = '—', thumbnail = '', duration = 0;

    if (!input.includes('youtube.com') && !input.includes('youtu.be')) {
        const results = await yts.search(input, { limit: 1, type: 'video' });
        if (!results.length) throw new Error('No results found for: ' + input);
        const v = results[0];
        videoUrl  = 'https://www.youtube.com/watch?v=' + v.id;
        title     = v.title;
        artist    = v.channel ? v.channel.name : '—';
        thumbnail = v.thumbnail ? v.thumbnail.url : '';
        duration  = v.duration || 0;
    }

    const streamUrl = await ytdlpGetUrl(videoUrl);
    return { streamUrl, title, artist, thumbnail, duration, videoUrl, expires: Date.now() + (5 * 60 * 1000) };
}

// ─── APIServer ────────────────────────────────────────────────────────────────

class APIServer {
    constructor(client, voiceManager, premiumManager) {
        this.client         = client;
        this.voiceManager   = voiceManager;
        this.premiumManager = premiumManager;
        this.server         = null;
        this.routes         = [];
        this.setupRoutes();
        this.setupWebPlayerAPI();
        this.setupCloud9API();
    }

    get(pattern, handler)    { this.routes.push({ method: 'GET',    pattern, handler }); }
    post(pattern, handler)   { this.routes.push({ method: 'POST',   pattern, handler }); }
    delete(pattern, handler) { this.routes.push({ method: 'DELETE', pattern, handler }); }

    async handleRequest(req, res) {
        setCORSHeaders(req, res);

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // ── Cloud 9 live stream ───────────────────────────────────────────────
        // Continuous stream — when one song ends, automatically pipes the next.
        // Handled directly here so ffmpeg can pipe to the real res object.
        // Cannot go through mockRes wrapper — needs writeHead + pipe.
        if (req.method === 'GET' && req.url.split('?')[0] === '/api/c9/live') {
            try {
                const radio = this.client.cloud9Radio;
                if (!radio || !radio.sessions || radio.sessions.size === 0) {
                    res.writeHead(503); res.end('Cloud 9 Radio is not ready'); return;
                }

                let ffmpegBin = 'ffmpeg';
                try { ffmpegBin = require('ffmpeg-static'); } catch(e) {}

                res.writeHead(200, {
                    'Content-Type':      'audio/mpeg',
                    'Transfer-Encoding': 'chunked',
                    'Cache-Control':     'no-cache, no-store',
                    'Connection':        'keep-alive',
                    'X-Accel-Buffering': 'no'
                });

                let clientGone = false;
                let currentFfmpeg = null;

                req.on('close', () => {
                    clientGone = true;
                    if (currentFfmpeg) {
                        try { currentFfmpeg.kill('SIGTERM'); } catch(e) {}
                    }
                    logger.debug('[Cloud9] Browser disconnected — stream stopped');
                });

                // Continuously stream song after song until the client disconnects
                const streamNextSong = () => {
                    if (clientGone) return;

                    // Get the current playing song from any active session (guild or global)
                    let song = null;
                    // Prefer a guild session if one exists
                    for (const [key, session] of radio.sessions) {
                        if (key !== '__global__' && session.currentSong && session.currentSong.filePath) {
                            song = session.currentSong; break;
                        }
                    }
                    // Fall back to global web session
                    if (!song) {
                        const global = radio.sessions.get('__global__');
                        if (global && global.currentSong && global.currentSong.filePath) {
                            song = global.currentSong;
                        }
                    }

                    // No song playing yet — poll every 2 seconds until one starts
                    if (!song || !song.filePath || !fs.existsSync(song.filePath)) {
                        if (!clientGone) setTimeout(streamNextSong, 2000);
                        return;
                    }

                    const ffmpeg = spawn(ffmpegBin, [
                        '-re',
                        '-i',       song.filePath,
                        '-vn',
                        '-acodec', 'libmp3lame',
                        '-ab',     '192k',
                        '-ar',     '44100',
                        '-ac',     '2',
                        '-f',      'mp3',
                        'pipe:1'
                    ], { windowsHide: true });

                    currentFfmpeg = ffmpeg;

                    ffmpeg.stdout.on('data', (chunk) => {
                        if (!clientGone) {
                            try { res.write(chunk); } catch(e) { clientGone = true; }
                        }
                    });

                    ffmpeg.stderr.on('data', () => {});

                    ffmpeg.on('error', (err) => {
                        logger.warn('[Cloud9 Stream] ffmpeg error:', err.message);
                        if (!clientGone) setTimeout(streamNextSong, 1000);
                    });

                    ffmpeg.on('close', () => {
                        currentFfmpeg = null;
                        // Song finished — wait a moment then pick up the next one
                        if (!clientGone) setTimeout(streamNextSong, 500);
                    });
                };

                streamNextSong();

            } catch(err) {
                logger.error('[Cloud9 Stream] Unhandled error:', err.message);
                if (!res.headersSent) { res.writeHead(500); res.end(err.message); }
            }
            return;
        }

        const urlPath = req.url.split('?')[0];
        const query   = getQuery(req.url);
        for (const route of this.routes) {
            const params = matchRoute(req.method, urlPath, route.method, route.pattern);
            if (params !== null) {
                const mockReq = { params, query, headers: req.headers, body: null };
                const mockRes = {
                    _statusCode: 200,
                    status(code) { this._statusCode = code; return this; },
                    json(data)   { sendJSON(res, this._statusCode, data); },
                    end()        { res.writeHead(this._statusCode); res.end(); }
                };
                try {
                    if (req.method === 'POST') mockReq.body = await getBody(req);
                    await route.handler(mockReq, mockRes);
                } catch (err) {
                    logger.error('[API] Route error:', err);
                    sendJSON(res, 500, { error: 'Internal server error' });
                }
                return;
            }
        }
        sendJSON(res, 404, { error: 'Not found' });
    }

    setupRoutes() {

        this.get('/api/health', function(req, res) {
            res.json({ status: 'ok', timestamp: Date.now() });
        });

        this.get('/api/admin/check/:userId', (req, res) => {
            const { userId } = req.params;
            res.json({ isAdmin: isAdmin(userId), userId });
        });

        this.get('/api/admin/premium-users', async (req, res) => {
            try {
                const requesterId = await discordUserId(req);
                if (!isAdmin(requesterId)) return res.status(403).json({ error: 'Access denied' });
                const users = Object.entries(this.premiumManager.db.data.premium_users || {}).map(([id, u]) => ({
                    userId: id, plan: u.plan, expiresAt: u.expires_at, createdAt: u.created_at,
                    active: u.expires_at > Math.floor(Date.now() / 1000)
                }));
                const lifetime = this.premiumManager.lifetimeUsers.map(id => ({
                    userId: id, plan: 'lifetime', expiresAt: 9999999999, createdAt: 0, active: true
                }));
                res.json({ users: [...lifetime, ...users], total: lifetime.length + users.length });
            } catch (error) {
                logger.error('[API] Admin premium-users error:', error);
                res.status(500).json({ error: 'Failed to fetch premium users' });
            }
        });

        this.post('/api/admin/grant-premium', async (req, res) => {
            try {
                const { userId, plan } = req.body;
                const requesterId = await discordUserId(req);
                if (!isAdmin(requesterId)) return res.status(403).json({ error: 'Access denied' });
                if (!userId || !plan)      return res.status(400).json({ error: 'Missing userId or plan' });
                await this.premiumManager.activatePremium(userId, `admin-grant-${Date.now()}`, plan);
                logger.info(`[Admin] ${requesterId} granted ${plan} premium to ${userId}`);
                res.json({ success: true, userId, plan });
            } catch (error) {
                logger.error('[API] Admin grant error:', error);
                res.status(500).json({ error: 'Failed to grant premium' });
            }
        });

        this.post('/api/admin/revoke-premium', async (req, res) => {
            try {
                const { userId } = req.body;
                const requesterId = await discordUserId(req);
                if (!isAdmin(requesterId)) return res.status(403).json({ error: 'Access denied' });
                if (!userId)               return res.status(400).json({ error: 'Missing userId' });
                await this.premiumManager.removePremium(userId);
                logger.info(`[Admin] ${requesterId} revoked premium from ${userId}`);
                res.json({ success: true, userId });
            } catch (error) {
                logger.error('[API] Admin revoke error:', error);
                res.status(500).json({ error: 'Failed to revoke premium' });
            }
        });

        this.get('/api/admin/stats', async (req, res) => {
            try {
                const requesterId = await discordUserId(req);
                if (!isAdmin(requesterId)) return res.status(403).json({ error: 'Access denied' });
                const aiStats      = this.client.aiEngine ? this.client.aiEngine.getGlobalAnalytics() : {};
                const vmMetrics    = this.voiceManager ? this.voiceManager.getMetrics() : {};
                const dbStats      = this.premiumManager.getStats();
                const premiumCount = Object.keys(this.premiumManager.db.data.premium_users || {}).length;
                res.json({
                    servers: this.client.guilds.cache.size,
                    users:   this.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
                    uptime: process.uptime(), memory: process.memoryUsage(),
                    premiumUsers: premiumCount + this.premiumManager.lifetimeUsers.length,
                    totalPlays: dbStats.total_plays || 0, activeQueues: vmMetrics.totalQueues || 0,
                    aiStats, timestamp: Date.now()
                });
            } catch (error) {
                logger.error('[API] Admin stats error:', error);
                res.status(500).json({ error: 'Failed to get admin stats' });
            }
        });

        this.get('/api/stats', (req, res) => {
            try {
                const guilds = this.client.guilds.cache.size;
                const users  = this.client.guilds.cache.reduce(function(a, g) { return a + g.memberCount; }, 0);
                let metrics  = { totalQueues: 0 };
                try { if (this.voiceManager && this.voiceManager.getMetrics) metrics = this.voiceManager.getMetrics(); } catch(e) {}
                const activeQueues = [];
                if (this.voiceManager && this.voiceManager.queues) {
                    for (const [guildId, queue] of this.voiceManager.queues.entries()) {
                        if (queue.playing && queue.current) {
                            const guild = this.client.guilds.cache.get(guildId);
                            activeQueues.push({ guildId, serverName: guild ? guild.name : guildId, title: queue.current.title, thumbnail: queue.current.thumbnail || '' });
                        }
                    }
                }
                let totalPlays = 0;
                try { totalPlays = this.premiumManager.getStats().total_plays || 0; } catch(e) {}
                res.json({ servers: guilds, users, totalPlays, totalQueues: metrics.totalQueues || activeQueues.length, activeQueues, adShowsPlayed: 0, uptime: process.uptime(), status: 'online', memory: process.memoryUsage() });
            } catch (error) {
                logger.error('[API] Stats error:', error);
                res.status(500).json({ error: 'Failed to get stats' });
            }
        });

        this.get('/api/premium/:userId', async (req, res) => {
            try {
                const { userId } = req.params;
                const isPremium  = await this.premiumManager.isPremium(userId);
                const tier       = await this.premiumManager.getPremiumType(userId);
                const isLifetime = this.premiumManager.isLifetime(userId);
                res.json({ premium: isPremium, tier: tier || 'free', lifetime: isLifetime, isAdmin: isAdmin(userId), features: isPremium ? ['volume', '247', 'filters', 'priority'] : [] });
            } catch (error) {
                logger.error('[API] Premium check error:', error);
                res.json({ premium: false, tier: 'free', lifetime: false, isAdmin: false, features: [] });
            }
        });

        this.post('/api/premium/activate', async (req, res) => {
            return res.status(403).json({ error: 'Disabled. Use the admin panel or a verified payment webhook.' });
            try {
                const { userId, subscriptionId, tier } = req.body;
                if (!userId || !subscriptionId) return res.status(400).json({ error: 'Missing fields' });
                await this.premiumManager.activatePremium(userId, subscriptionId, tier);
                res.json({ success: true, tier });
            } catch (error) {
                logger.error('[API] Premium activate error:', error);
                res.status(500).json({ error: 'Failed to activate premium' });
            }
        });

        this.post('/api/premium/revoke', async (req, res) => {
            return res.status(403).json({ error: 'Disabled. Use the admin panel.' });
            try {
                const { userId } = req.body;
                if (!userId) return res.status(400).json({ error: 'Missing userId' });
                await this.premiumManager.removePremium(userId);
                res.json({ success: true });
            } catch (error) {
                logger.error('[API] Premium revoke error:', error);
                res.status(500).json({ error: 'Failed to revoke premium' });
            }
        });

        this.post('/api/auth/discord', async (req, res) => {
            try {
                const { code, redirect_uri } = req.body;
                const tok = await axios.post('https://discord.com/api/oauth2/token',
                    new URLSearchParams({ client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET, code, grant_type: 'authorization_code', redirect_uri, scope: 'identify guilds bot' }),
                    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                );
                const at = tok.data.access_token;
                const [uR, gR] = await Promise.all([
                    axios.get('https://discord.com/api/users/@me',        { headers: { Authorization: `Bearer ${at}` } }),
                    axios.get('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bearer ${at}` } })
                ]);
                const botIds = new Set(this.client.guilds.cache.keys());
                res.json({ user: uR.data, guilds: gR.data.filter(function(g) { return botIds.has(g.id); }), access_token: at });
            } catch (error) {
                logger.error('[API] OAuth error:', error);
                res.status(500).json({ error: 'Authentication failed' });
            }
        });

        this.get('/api/featured', (req, res) => {
            try {
                if (this.client.featuredManager) {
                    const featured = this.client.featuredManager.getFeatured();
                    if (featured && (featured.spotlight?.length > 0 || featured.rising?.length > 0)) return res.json(featured);
                }
                if (this.client.aiEngine) {
                    const trending = this.client.aiEngine.getGlobalTrending(20);
                    if (trending.length > 0) {
                        const artistMap = new Map();
                        for (const t of trending) {
                            if (!artistMap.has(t.artist)) artistMap.set(t.artist, { name: t.artist, plays: 0, songs: [] });
                            const a = artistMap.get(t.artist); a.plays += t.plays; a.songs.push(t.title);
                        }
                        const artists   = Array.from(artistMap.values()).sort((a, b) => b.plays - a.plays);
                        const spotlight = artists.slice(0, 6).map((a, i) => ({ name: a.name, genre: 'Mixed', plays: a.plays, pinned: i === 0, reason: i === 0 ? 'Top pick this week' : `${a.plays} plays`, image: null, url: null }));
                        const rising    = artists.slice(6, 14).map(a => ({ name: a.name, genre: 'Mixed', plays: a.plays, image: null, url: null }));
                        return res.json({ spotlight, rising, genres: {}, source: 'ai-trends' });
                    }
                }
                res.json({ spotlight: [], rising: [], genres: {} });
            } catch (error) {
                logger.error('[API] Featured error:', error);
                res.json({ spotlight: [], rising: [], genres: {} });
            }
        });

        this.post('/api/featured/update', async (req, res) => {
            try {
                const requesterId = await discordUserId(req);
                if (!isAdmin(requesterId)) return res.status(403).json({ error: 'Access denied' });
                const { spotlight, rising, genres, pinnedArtist } = req.body;
                if (this.client.featuredManager) {
                    if (pinnedArtist) { this.client.featuredManager.setPinnedArtist(pinnedArtist); }
                    else {
                        const cur = this.client.featuredManager.getFeatured();
                        if (spotlight) cur.spotlight = spotlight;
                        if (rising)    cur.rising    = rising;
                        if (genres)    cur.genres    = genres;
                        this.client.featuredManager.db.setFeaturedArtists(cur);
                    }
                }
                res.json({ success: true });
            } catch (error) {
                logger.error('[API] Featured update error:', error);
                res.status(500).json({ error: 'Failed to update featured' });
            }
        });

        this.get('/api/sessions', (req, res) => {
            try {
                const sessions = [];
                if (this.voiceManager && this.voiceManager.queues) {
                    for (const [guildId, queue] of this.voiceManager.queues.entries()) {
                        if (!queue.playing || !queue.current) continue;
                        const guild = this.client.guilds.cache.get(guildId);
                        if (!guild) continue;
                        const slug      = guild.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                        const bot       = guild.members.cache.get(this.client.user.id);
                        const listeners = bot && bot.voice.channel ? bot.voice.channel.members.filter(function(m) { return !m.user.bot; }).size : 0;
                        sessions.push({ guildId, slug, serverName: guild.name, currentSong: queue.current.title, artist: queue.current.artist || queue.current.channel || '', thumbnail: queue.current.thumbnail || '', listeners, queueLength: queue.songs.length });
                    }
                }
                res.json(sessions);
            } catch (error) {
                logger.error('[API] Sessions error:', error);
                res.json([]);
            }
        });

        this.get('/api/analytics/:serverId', (req, res) => {
            try {
                const { serverId } = req.params;
                const days = parseInt(req.query.days) || 7;
                let analytics = { serverId, days, totalPlays: 0, uniqueListeners: 0, skipRate: 0, peakHour: null, topSongs: [], topListeners: [], genreBreakdown: {} };
                try { if (this.client.aiEngine && this.client.aiEngine.getServerAnalytics) Object.assign(analytics, this.client.aiEngine.getServerAnalytics(serverId, days) || {}); } catch(e) {}
                try { const q = this.voiceManager.getQueue(serverId); if (q) { analytics.currentQueueLength = q.songs.length; analytics.isPlaying = q.playing; } } catch(e) {}
                res.json(analytics);
            } catch (error) {
                logger.error('[API] Analytics error:', error);
                res.status(500).json({ error: 'Failed to get analytics' });
            }
        });

        this.get('/api/badges/:userId', (req, res) => {
            try {
                const { userId } = req.params;
                const serverId = req.query.server;
                let songsQueued = 0, topWeek = false, multiGenre = false;
                try {
                    if (this.client.aiEngine && this.client.aiEngine.getUserStats) {
                        const s = this.client.aiEngine.getUserStats(userId, serverId);
                        if (s) { songsQueued = s.totalListens || s.songsQueued || 0; topWeek = !!s.topWeek; multiGenre = !!s.multiGenre; }
                    }
                } catch(e) {}
                let tier = 'Listener', nextTier = 'Bronze DJ', nextAt = 10;
                if      (songsQueued >= 10000) { tier = 'Nexus Tier';  nextTier = null;          nextAt = null;  }
                else if (songsQueued >= 5000)  { tier = 'Mythic';      nextTier = 'Nexus Tier';  nextAt = 10000; }
                else if (songsQueued >= 2500)  { tier = 'Legend';      nextTier = 'Mythic';      nextAt = 5000;  }
                else if (songsQueued >= 1000)  { tier = 'Master DJ';   nextTier = 'Legend';      nextAt = 2500;  }
                else if (songsQueued >= 500)   { tier = 'Diamond DJ';  nextTier = 'Master DJ';   nextAt = 1000;  }
                else if (songsQueued >= 200)   { tier = 'Platinum DJ'; nextTier = 'Diamond DJ';  nextAt = 500;   }
                else if (songsQueued >= 100)   { tier = 'Gold DJ';     nextTier = 'Platinum DJ'; nextAt = 200;   }
                else if (songsQueued >= 50)    { tier = 'Silver DJ';   nextTier = 'Gold DJ';     nextAt = 100;   }
                else if (songsQueued >= 10)    { tier = 'Bronze DJ';   nextTier = 'Silver DJ';   nextAt = 50;    }
                res.json({ userId, songsQueued, tier, nextTier, nextAt, topWeek, multiGenre });
            } catch (error) {
                res.json({ songsQueued: 0, tier: 'Listener', nextTier: 'Bronze DJ', nextAt: 10 });
            }
        });

        this.get('/api/guild-roles/:guildId', async (req, res) => {
            try {
                const guild = this.client.guilds.cache.get(req.params.guildId);
                if (!guild) return res.status(404).json({ error: 'Bot not in that server', roles: [] });
                await guild.roles.fetch();
                const roles = guild.roles.cache.filter(function(r) { return r.name !== '@everyone'; })
                    .sort(function(a, b) { return b.position - a.position; })
                    .map(function(r) { return { id: r.id, name: r.name, color: r.hexColor, position: r.position, managed: r.managed }; });
                res.json({ guildId: req.params.guildId, guildName: guild.name, roles });
            } catch (error) {
                logger.error('[API] Guild roles error:', error);
                res.status(500).json({ error: 'Failed to fetch roles', roles: [] });
            }
        });

        this.get('/api/guild-roles/:guildId/:roleId/members', async (req, res) => {
            try {
                const { guildId, roleId } = req.params;
                const guild = this.client.guilds.cache.get(guildId);
                if (!guild) return res.status(404).json({ error: 'Bot not in that server', members: [] });
                const members = await guild.members.fetch();
                const role    = guild.roles.cache.get(roleId);
                if (!role) return res.status(404).json({ error: 'Role not found', members: [] });
                const roleMembers = members.filter(function(m) { return m.roles.cache.has(roleId) && !m.user.bot; })
                    .map(function(m) { return { id: m.user.id, username: m.user.username, displayName: m.displayName, avatar: m.user.displayAvatarURL(), joinedAt: m.joinedTimestamp }; });
                res.json({ guildId, roleId, roleName: role.name, members: roleMembers, count: roleMembers.length });
            } catch (error) {
                logger.error('[API] Role members error:', error);
                res.status(500).json({ error: 'Failed to fetch members', members: [] });
            }
        });

        this.get('/api/auto-detect/:userId', (req, res) => {
            try {
                const { userId } = req.params;
                for (const [guildId, guild] of this.client.guilds.cache) {
                    const member = guild.members.cache.get(userId);
                    if (!member || !member.voice.channel) continue;
                    const queue       = this.voiceManager ? this.voiceManager.getQueue(guildId) : null;
                    const bot         = guild.members.cache.get(this.client.user.id);
                    const botInSameVC = bot && bot.voice.channel && bot.voice.channelId === member.voice.channelId;
                    return res.json({
                        found: true, guildId, guildName: guild.name,
                        channelId: member.voice.channelId, channelName: member.voice.channel.name,
                        botPresent: !!botInSameVC,
                        playing: !!(queue && queue.playing && queue.current),
                        current: queue && queue.current ? {
                            title: queue.current.title, artist: queue.current.artist || queue.current.channel || '—',
                            thumbnail: queue.current.thumbnail || '', duration: queue.current.duration || 0, url: queue.current.url || ''
                        } : null
                    });
                }
                res.json({ found: false });
            } catch (error) {
                logger.error('[API] Auto-detect error:', error);
                res.json({ found: false });
            }
        });

        logger.info('✅ Core API routes configured');
    }

    setupWebPlayerAPI() {
        logger.info('🎵 Setting up Web Player API...');

        this.get('/api/vc-status', async (req, res) => {
            try {
                const serverId = req.query.server;
                if (!serverId) return res.json({ connected: false, listeners: [] });
                const guild = this.client.guilds.cache.get(serverId);
                if (!guild) return res.json({ connected: false, listeners: [] });
                const bot = guild.members.cache.get(this.client.user.id);
                if (!bot || !bot.voice.channel) return res.json({ connected: false, listeners: [] });
                const channel   = bot.voice.channel;
                const listeners = channel.members.filter(function(m) { return !m.user.bot; })
                    .map(function(m) { return { id: m.user.id, username: m.user.username, avatar: m.user.displayAvatarURL() }; });
                res.json({ connected: true, channelName: channel.name, channelId: channel.id, listeners, listenerCount: listeners.length });
            } catch (error) {
                logger.error('[API] VC Status error:', error);
                res.json({ connected: false, listeners: [] });
            }
        });

        this.get('/api/search', async (req, res) => {
            try {
                const query = req.query.q;
                if (!query || query.length < 2) return res.json({ songs: [] });
                const results = await yts.search(query, { limit: 10, type: 'video' });
                res.json({
                    songs: results.map(function(v) {
                        return { id: v.id, title: v.title, artist: v.channel ? v.channel.name : '—', duration: v.duration, thumbnail: v.thumbnail ? v.thumbnail.url : '', url: 'https://www.youtube.com/watch?v=' + v.id, views: v.views };
                    })
                });
            } catch (error) {
                logger.error('[API] Search error:', error);
                res.json({ songs: [] });
            }
        });

        this.post('/api/resolve-url', async (req, res) => {
            try {
                const { query, videoId } = req.body;
                if (!query && !videoId) return res.status(400).json({ error: 'query or videoId required' });
                const input = videoId ? 'https://www.youtube.com/watch?v=' + videoId : query;
                const result = await resolveAudio(input);
                res.json(result);
            } catch (error) {
                logger.error('[API] resolve-url error:', error);
                res.status(500).json({ error: 'Failed to resolve audio: ' + error.message });
            }
        });

        this.get('/api/stream-url/:serverId', async (req, res) => {
            try {
                const queue = this.voiceManager.getQueue(req.params.serverId);
                if (!queue || !queue.current) return res.status(404).json({ error: 'Nothing playing' });
                const current   = queue.current;
                const sourceUrl = current.url || current.webpage_url;
                if (!sourceUrl) return res.status(404).json({ error: 'No source URL on current track' });
                try {
                    const result = await resolveAudio(sourceUrl);
                    res.json({ streamUrl: result.streamUrl, title: current.title, artist: current.artist || current.channel || '—', thumbnail: current.thumbnail || '', duration: current.duration, expires: result.expires });
                } catch (resolveErr) {
                    logger.warn('[API] stream-url resolve failed, returning raw URL:', resolveErr.message);
                    res.json({ streamUrl: sourceUrl, title: current.title, artist: current.artist || current.channel || '—', thumbnail: current.thumbnail || '', duration: current.duration, fallback: true });
                }
            } catch (error) {
                logger.error('[API] stream-url error:', error);
                res.status(500).json({ error: 'Failed to get stream URL' });
            }
        });

        this.post('/api/import-playlist', async (req, res) => {
            try {
                const { url } = req.body;
                if (!url) return res.status(400).json({ error: 'URL required' });
                if (!url.includes('youtube.com/playlist')) return res.status(400).json({ error: 'Only YouTube playlists supported' });
                const playlist = await yts.getPlaylist(url);
                const songs = (playlist.videos || []).slice(0, 100).map(function(v) {
                    return { id: v.id, title: v.title, artist: v.channel ? v.channel.name : '—', duration: v.duration, thumbnail: v.thumbnail ? v.thumbnail.url : '', url: 'https://www.youtube.com/watch?v=' + v.id };
                });
                res.json({ success: true, songs, count: songs.length, title: playlist.title });
            } catch (error) {
                logger.error('[API] Import playlist error:', error);
                res.status(500).json({ error: 'Failed to import playlist' });
            }
        });

        this.get('/api/nowplaying/:serverId', (req, res) => {
            try {
                const queue = this.voiceManager.getQueue(req.params.serverId);
                if (!queue || !queue.current) return res.json({ playing: false });
                res.json({ playing: queue.playing, current: { title: queue.current.title, artist: queue.current.artist || queue.current.channel, thumbnail: queue.current.thumbnail, duration: queue.current.duration, url: queue.current.url }, queueLength: queue.songs.length });
            } catch (error) { res.status(500).json({ error: 'Failed to get now playing' }); }
        });

        this.get('/api/queue/:serverId', (req, res) => {
            try {
                const queue = this.voiceManager.getQueue(req.params.serverId);
                if (!queue) return res.json({ current: null, songs: [], playing: false });
                const elapsed = queue.startedAt ? Date.now() - queue.startedAt : 0;
                const requesters = {};
                if (queue.userRequests) {
                    for (const [songId, info] of queue.userRequests.entries()) requesters[songId] = info;
                }
                res.json({ current: queue.current, songs: queue.songs, playing: queue.playing, loop: queue.loop, autoplay: queue.autoplay || false, elapsed, requesters });
            } catch (error) { res.json({ current: null, songs: [], playing: false, elapsed: 0, requesters: {} }); }
        });

        this.delete('/api/queue/:serverId', (req, res) => {
            try {
                const queue = this.voiceManager.getQueue(req.params.serverId);
                if (queue) queue.songs = [];
                res.json({ success: true });
            } catch (error) { res.status(500).json({ error: 'Failed to clear queue' }); }
        });

        this.post('/api/control/:serverId/:action', (req, res) => {
            try {
                const { serverId, action } = req.params;
                switch (action) {
                    case 'pause':   this.voiceManager.pause(serverId);   break;
                    case 'resume':  this.voiceManager.resume(serverId);  break;
                    case 'skip':    this.voiceManager.skip(serverId);    break;
                    case 'stop':    this.voiceManager.stop(serverId);    break;
                    case 'shuffle': this.voiceManager.shuffle(serverId); break;
                    default: return res.status(400).json({ error: 'Invalid action' });
                }
                res.json({ success: true, action });
            } catch (error) {
                logger.error('[API] Control error:', error);
                res.status(500).json({ error: 'Control failed' });
            }
        });

        this.post('/api/web-play', async (req, res) => {
            try {
                const { serverId, channelId, song, userId } = req.body;
                if (!serverId || !song) return res.status(400).json({ error: 'Missing required fields' });
                const guild = this.client.guilds.cache.get(serverId);
                if (!guild) return res.status(404).json({ error: 'Server not found' });
                let channel;
                if (channelId) { channel = guild.channels.cache.get(channelId); }
                else { const bot = guild.members.cache.get(this.client.user.id); if (bot && bot.voice.channel) channel = bot.voice.channel; }
                if (!channel) return res.status(400).json({ error: 'No voice channel found' });
                const queue = await this.voiceManager.getOrCreateQueue(serverId, channel, channel);
                queue.songs.push(song);
                if (userId) queue.userRequests.set(song.id, { userId, username: 'Web User' });
                if (!queue.playing) this.voiceManager.playQueue(serverId, channel);
                try { if (this.client.featuredManager) this.client.featuredManager.recordPlay(song, userId); } catch(e) {}
                res.json({ success: true, queueLength: queue.songs.length, position: queue.songs.length });
            } catch (error) {
                logger.error('[API] Web Play error:', error);
                res.status(500).json({ error: 'Failed to add song' });
            }
        });

        this.get('/api/history/:serverId/:userId', (req, res) => {
            try {
                const { serverId, userId } = req.params;
                const limit = parseInt(req.query.limit) || 50;
                const combined = new Map();
                try {
                    const vmHistory = this.voiceManager.getUserHistory ? (this.voiceManager.getUserHistory(serverId, userId) || []) : [];
                    for (const entry of vmHistory) {
                        const key = `${entry.song?.id || entry.song?.title}_${entry.timestamp}`;
                        combined.set(key, { song: entry.song, timestamp: entry.timestamp, guildId: serverId, source: 'session' });
                    }
                } catch(e) {}
                try {
                    if (this.client.aiEngine && this.client.aiEngine.listeningHistory) {
                        const aiHistory = this.client.aiEngine.listeningHistory.get(userId) || [];
                        for (const entry of aiHistory) {
                            if (serverId !== 'all' && entry.guildId !== serverId) continue;
                            const key = `${entry.song?.id || entry.song?.title}_${entry.timestamp}`;
                            combined.set(key, { song: entry.song, timestamp: entry.timestamp, guildId: entry.guildId, source: 'ai' });
                        }
                    }
                } catch(e) {}
                const history = Array.from(combined.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
                res.json({ history, total: history.length, userId, serverId });
            } catch (error) {
                logger.error('[API] History error:', error);
                res.json({ history: [], total: 0 });
            }
        });

        this.get('/api/server-history/:serverId', (req, res) => {
            try {
                const { serverId } = req.params;
                const limit = parseInt(req.query.limit) || 100;
                const combined = new Map();
                try {
                    if (this.client.aiEngine && this.client.aiEngine.listeningHistory) {
                        for (const [uid, userHistory] of this.client.aiEngine.listeningHistory.entries()) {
                            for (const entry of userHistory) {
                                if (entry.guildId !== serverId) continue;
                                const key = `${entry.song?.id || entry.song?.title}_${entry.timestamp}`;
                                combined.set(key, { song: entry.song, timestamp: entry.timestamp, userId: uid, guildId: serverId });
                            }
                        }
                    }
                } catch(e) {}
                const history = Array.from(combined.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
                res.json({ history, total: history.length, serverId });
            } catch (error) {
                logger.error('[API] Server history error:', error);
                res.json({ history: [], total: 0 });
            }
        });

        this.get('/api/liked/:userId', (req, res) => {
            try { res.json({ songs: (this.voiceManager.getLikedSongs ? this.voiceManager.getLikedSongs(req.params.userId) : null) || [] }); }
            catch (error) { res.json({ songs: [] }); }
        });

        this.post('/api/like-song', (req, res) => {
            try {
                const { userId, song } = req.body;
                const added = this.voiceManager.addLikedSong ? this.voiceManager.addLikedSong(userId, song) : false;
                res.json({ success: true, added });
            } catch (error) { res.status(500).json({ error: 'Failed to like song' }); }
        });

        this.get('/api/user-playlists/:userId', (req, res) => { res.json({ playlists: [] }); });

        this.post('/api/save-playlist', (req, res) => {
            const { name, songs } = req.body;
            res.json({ success: true, playlist: { id: Date.now().toString(), name, songs: songs || [] } });
        });

        this.get('/api/radio/:station', (req, res) => {
            const streams = { stan: 'https://api.stansbeatbot.online:3006/stream/stan', roger: 'https://api.stansbeatbot.online:3006/stream/roger', full: 'https://api.stansbeatbot.online:3006/stream/full' };
            const station = req.params.station;
            if (!streams[station]) return res.status(404).json({ error: 'Station not found' });
            res.json({ station, streamUrl: streams[station], nowPlaying: { title: station.charAt(0).toUpperCase() + station.slice(1) + "'s Radio", artist: 'American Dad Radio' } });
        });

        logger.info('✅ Web Player API ready');
    }

    // ================================================================
    // CLOUD 9 RADIO API
    // Note: /api/c9/live is handled directly in handleRequest above
    // because ffmpeg needs to pipe to the real res — not mockRes.
    // ================================================================
    setupCloud9API() {
        logger.info('📻 Setting up Cloud 9 Radio API...');

        this.get('/api/c9/pool', (req, res) => {
            try {
                const radio = this.client.cloud9Radio;
                if (!radio) return res.status(503).json({ error: 'Radio engine not loaded' });
                const pool = radio.getSongPool();
                res.json({ total: pool.length, tracks: pool.map(t => ({ title: t.title, artist: t.artist, type: t.type })) });
            } catch(err) { res.status(500).json({ error: err.message }); }
        });

        this.get('/api/c9/status/:guildId', (req, res) => {
            try {
                const radio = this.client.cloud9Radio;
                if (!radio) return res.json({ active: false });
                const session = radio.getSession(req.params.guildId);
                if (!session) return res.json({ active: false });
                const uptime = Math.floor((Date.now() - session.startedAt) / 1000);
                const pool   = radio.getSongPool();
                res.json({
                    active: true,
                    currentSong: session.currentSong ? { title: session.currentSong.title, artist: session.currentSong.artist, type: session.currentSong.type } : null,
                    poolSize: pool.length, uptimeSecs: uptime
                });
            } catch(err) { res.status(500).json({ error: err.message }); }
        });

        this.get('/api/c9/global-status', (req, res) => {
            try {
                const radio = this.client.cloud9Radio;
                if (!radio || !radio.sessions) return res.json({ active: false });

                // Try guild sessions first, then fall back to global web session
                let found = null;
                for (const [guildId, session] of radio.sessions) {
                    if (guildId !== '__global__' && session.currentSong) { found = { guildId, session }; break; }
                }
                if (!found) {
                    const g = radio.sessions.get('__global__');
                    if (g && g.currentSong) found = { guildId: '__global__', session: g };
                }
                if (!found) return res.json({ active: false });

                const { guildId, session } = found;
                const pool   = radio.getSongPool();
                const uptime = Math.floor((Date.now() - session.startedAt) / 1000);
                return res.json({
                    active: true, guildId,
                    currentSong: { title: session.currentSong.title, artist: session.currentSong.artist, type: session.currentSong.type, thumbnail: session.currentSong.thumbnail || null },
                    poolSize: pool.length, uptimeSecs: uptime,
                    webOnly: session.webOnly || false
                });
            } catch(err) { res.status(500).json({ error: err.message }); }
        });

        this.get('/api/c9/stream-url', (req, res) => {
            try {
                const radio = this.client.cloud9Radio;
                if (!radio || !radio.sessions || radio.sessions.size === 0) {
                    return res.status(404).json({ error: 'Cloud 9 Radio is not broadcasting' });
                }
                let currentSong = null;
                for (const [, session] of radio.sessions) {
                    if (session.currentSong) { currentSong = session.currentSong; break; }
                }
                if (!currentSong) return res.status(404).json({ error: 'No active track' });
                res.json({ url: 'https://api.stansbeatbot.online:3006/api/c9/live', title: currentSong.title, artist: currentSong.artist, type: currentSong.type });
            } catch(err) { res.status(500).json({ error: err.message }); }
        });

        this.post('/api/c9/submit', async (req, res) => {
            try {
                const radio = this.client.cloud9Radio;
                if (!radio) return res.status(503).json({ error: 'Radio engine not loaded' });
                const { userId, username, url, filename, fileBase64 } = req.body;
                if (!userId || !username) return res.status(400).json({ error: 'userId and username are required' });
                if (!url && !fileBase64)  return res.status(400).json({ error: 'Provide a file URL or fileBase64' });
                if (!filename)            return res.status(400).json({ error: 'filename is required' });
                const buffer = fileBase64 ? Buffer.from(fileBase64, 'base64') : await downloadUrl(url);
                const result = await radio.handleSubmission({ userId, username }, buffer, filename);
                if (!result.success) return res.status(400).json({ success: false, reason: result.reason });
                res.json({ success: true, filename: result.filename, duration: result.duration, message: 'Track approved and added to Cloud 9 Radio pool!' });
            } catch(err) {
                res.status(500).json({ error: err.message });
            }
        });

        logger.info('✅ Cloud 9 Radio API ready');
    }

    start() {
        const certPath = path.join(__dirname, '..', 'certs', 'api.stansbeatbot.online-crt.pem');
        const keyPath  = path.join(__dirname, '..', 'certs', 'api.stansbeatbot.online-key.pem');
        if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
            logger.error('❌ TLS certs not found — HTTPS API cannot start.');
            process.exit(1);
        }
        this.server = https.createServer(
            { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) },
            (req, res) => this.handleRequest(req, res)
        );
        this.server.listen(3006, '0.0.0.0', function() {
            logger.success('🔒 API live at https://api.stansbeatbot.online:3006');
        });
    }

    stop() {
        if (this.server) this.server.close(function() { logger.info('API Server stopped'); });
    }
}

module.exports = APIServer;