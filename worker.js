/**
 * Clean-IP Subscription Manager - Cloudflare Worker
 * v1.0.0
 *
 * Author: Yasin (github.com/Yarumin)
 * Repository: https://github.com/Yarumin/sub-manager
 *
 * A single-file Cloudflare Worker that manages proxy subscription links
 * (VLESS / Trojan / VMess / Shadowsocks) for Xray-core based clients. Each
 * "source" you create holds one or more independent "parts" - a
 * subscription URL to pull configs from, or a block of manually pasted
 * configs - and each part has its own clean-IP / port / distribution /
 * auto-refresh settings. /sub/{slug} serves the combined, pre-generated
 * output for that source.
 *
 * ----------------------------------------------------------------------
 * QUICK SETUP
 * ----------------------------------------------------------------------
 * 1. Create a Worker in the Cloudflare dashboard and paste this file in as
 *    its entire source (Workers & Pages -> your worker -> Edit code).
 * 2. Create a KV namespace and bind it to this worker under the exact name
 *    SUB_DB (Settings -> Bindings -> Add binding -> KV namespace).
 * 3. Set a Secret (NOT a plain-text env var) named ADMIN_PASSWORD with a
 *    strong password. Without this, the worker falls back to a public
 *    default password and the panel will show a warning banner until you
 *    fix it.
 * 4. Deploy. Your panel is at https://<your-worker>.workers.dev + the
 *    value of PANEL_PATH below (default "/app"). Consider changing
 *    PANEL_PATH to something else of your own choosing before deploying -
 *    it doesn't need to be secret, it just shouldn't be a well-known name
 *    like /admin or /panel that scanners try by default.
 * 5. (Optional) Add a Cron Trigger if you want subscriptions refreshed
 *    proactively on a schedule, even when nobody is fetching them. This
 *    is NOT required for correctness: every /sub/{slug} request already
 *    self-refreshes any of that source's url parts that are due, in the
 *    background, without making the request wait (see
 *    handleServeSubscription / computeNextAutoRefreshDueAt). A Cron
 *    Trigger just means the first request after a quiet period doesn't
 *    have to be the one that triggers the catch-up fetch.
 * 6. Once logged in, the panel's backup section can export sources,
 *    clean-IP lists, and/or Cloudflare API connections (your choice) as a
 *    JSON file, and import it back - into this same worker or a new one.
 *    It's forward-compatible: a file exported by an older version should
 *    still import cleanly into a newer one.
 *
 * Notes for anyone reading/maintaining this file:
 * - There is no database beyond the one KV namespace. Two top-level keys
 *   hold everything (SOURCES, APP_SETTINGS); one out_{sourceId} key per
 *   source holds its last-generated subscription output; one
 *   slugidx_{slug} key per source maps its public link to its internal id
 *   (see makeUniqueSlug / handleUpdateSourceSlug); one session_{token} key
 *   per active login session; and a couple of small login_fail_{ip} keys
 *   exist transiently for the login cooldown.
 * - Numbers/names shown to the user (e.g. "MySource 5") are NEVER stored
 *   as a persistent counter - they're recomputed from a config's current
 *   position every time anything changes. See assignSequentialNames().
 * - Auto-refresh is a per-part setting (only url parts have it - a manual
 *   part has nothing to fetch). A source with several links can have a
 *   different interval per link, or have automatic updates off entirely
 *   on some of them. See syncSingleSourceLogic's 'auto' vs 'manual' mode.
 * - The safety caps below exist because this is designed to comfortably
 *   run on Cloudflare's free plan (KV read/write limits, Worker CPU
 *   limits) - they're deliberately generous, not arbitrary.
 */



// ============================================================================
// CONSTANTS
// ============================================================================

const BUILTIN_CLEAN_IP_LIST_ID = 'default';
const DEFAULT_CLEAN_IPS = [
    "104.26.3.241", "104.24.240.191", "104.21.124.144", "104.18.149.104",
    "172.67.240.13", "104.18.131.149", "172.66.41.171", "162.159.149.6",
    "104.20.39.38", "108.162.196.8", "104.19.112.223", "104.17.207.125",
    "104.25.6.188", "104.16.81.97", "104.27.78.209"
];

// From https://www.cloudflare.com/ips-v4 and /ips-v6. Used by the
// "independent" per-part option that only replaces hosts already in these ranges.
const CLOUDFLARE_IP_RANGES = [
    "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
    "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
    "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
    "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
    "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
    "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32"
];

const KNOWN_NOISE_KEYS = new Set(['junk', 'rnd', 'random', 'nonce', 'seed', 'salt', 'ts', 'timestamp', 'cache', 'cachebuster', 'v', '_']);

// Safety caps - see top-of-file docstring for the free-plan reasoning.
const MAX_URLS_PER_SOURCE = 10;
const MAX_MANUAL_LINES_PER_ADD = 500;
const MAX_BASE_CONFIGS_PER_PART = 1000;
const MAX_BLOCKED_PER_PART = 300;
const MAX_CUSTOM_NAMES_PER_PART = 300;
const MAX_CLEAN_IPS_PER_LIST = 300;
const MAX_CLEAN_IP_LISTS = 30;
const MAX_FINAL_CONFIGS_PER_PART = 6000;

// TLS ClientHello fingerprint/cipher/fragment defaults for the upload-boost
// feature - method and default values from Patternia.
const DEFAULT_UPLOAD_BOOST_FINGERPRINT = 'unsafe';
const DEFAULT_UPLOAD_BOOST_CIPHER_SUITES = 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256';
const DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK = '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["5","94","1"],"delays":["0"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["109","1"],"delays":["1"],"maxSplit":"355"}}]}';

const SUBSCRIPTION_FETCH_TIMEOUT_MS = 15 * 1000;

// Per-source auto-refresh: on by default, once a day. A source can turn
// this off (falls back to manual sync / the panel's "sync" button only)
// or change the interval. Bounds are generous but not unlimited, since an
// interval of a few seconds would defeat the point of "self-refreshing
// only when actually stale" and just hammer the upstream link instead.
const DEFAULT_AUTO_REFRESH_MINUTES = 24 * 60;
const MIN_AUTO_REFRESH_MINUTES = 15;
const MAX_AUTO_REFRESH_MINUTES = 30 * 24 * 60;

// Bumped whenever the *shape* of the exported backup JSON changes in a way
// that importBackupData() needs to know about. Not tied to the panel's own
// v1.0.0 version number above - a backup written by panel v1.4.0 might
// still be schema version 1 if nothing about the data shape changed.
// importBackupData() is written to accept any schema version up through
// this one, filling in sensible defaults for fields it doesn't recognize,
// so a backup taken today keeps working after future updates.
const BACKUP_FORMAT_VERSION = 1;

// Login protection: instead of a hard lock after N attempts (which can trap
// the real admin behind a shared/CGNAT IP for many minutes), each failed
// attempt raises a short cooldown before the NEXT attempt is accepted. The
// cooldown grows with consecutive fails and is capped low enough to never
// meaningfully block a human re-typing a forgotten password, while still
// making a fast automated guesser slow to the point of being pointless.
const LOGIN_COOLDOWN_STEP_SECONDS = 2;
const LOGIN_COOLDOWN_CAP_SECONDS = 30;
const LOGIN_FAIL_RECORD_TTL_SECONDS = 20 * 60;

// The admin UI intentionally does NOT live at a well-known path like
// /admin or /panel - those are the first things scanners try. This can be
// any plain-looking word; it doesn't need to be a secret/random string,
// it just shouldn't be the obvious one.
const PANEL_PATH = '/app';

// A source's public link is /sub/{slug}. The slug is randomly generated
// once (see makeSlug) and is independent from the source's internal id -
// the id never changes and is what everything else (parts, KV keys, API
// paths) is keyed on, while the slug is just the public-facing part of the
// URL and can be edited freely (see handleUpdateSourceSlug) without
// disturbing anything internal.
const SLUG_MIN_LENGTH = 4;
const SLUG_MAX_LENGTH = 32;
const SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;

function makeSlug() {
    return crypto.randomUUID().split('-')[0];
}

// Astronomically unlikely to collide (8 hex chars = 4 billion+ combinations)
// but the check is nearly free since the caller already has the full
// sources list in hand, so there's no reason not to guarantee it.
function makeUniqueSlug(sources) {
    const existing = new Set((sources || []).map(s => s.slug).filter(Boolean));
    let slug = makeSlug();
    while (existing.has(slug)) slug = makeSlug();
    return slug;
}

// ============================================================================
// SMALL UTILITIES
// ============================================================================

function shortId() {
    return crypto.randomUUID().split('-')[0];
}

async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const SESSION_TTL_SECONDS = 864000; // 10 days, matches the cookie's Max-Age

// A session is a random, unguessable token stored server-side (KV) rather
// than a hash of the password itself. This means: the cookie value reveals
// nothing about the password even if leaked, and a session can actually be
// revoked (logout deletes the KV record - a password-hash cookie can't be
// individually revoked since it's always valid as long as the password is).
async function createSession(env) {
    const token = crypto.randomUUID();
    await env.SUB_DB.put(`session_${token}`, '1', { expirationTtl: SESSION_TTL_SECONDS });
    return token;
}

async function isValidSession(token, env) {
    if (!token) return false;
    const record = await env.SUB_DB.get(`session_${token}`);
    return record !== null;
}

async function destroySession(token, env) {
    if (!token) return;
    try { await env.SUB_DB.delete(`session_${token}`); } catch (e) { /* already gone */ }
}

// Real parsing instead of a substring check - `cookie.includes('session=' +
// x)` could in principle match a totally different cookie that happens to
// contain that substring somewhere in its own value.
function parseCookies(cookieHeader) {
    const out = {};
    (cookieHeader || '').split(';').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx === -1) return;
        const key = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (key) out[key] = value;
    });
    return out;
}

// IPv6 literals must be bracketed to be valid as a URL hostname.
function normalizeHostForUrl(ip) {
    const trimmed = (ip || '').trim();
    return trimmed.includes(':') && !trimmed.startsWith('[') ? `[${trimmed}]` : trimmed;
}

function base64UrlDecode(str) {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4 !== 0) s += '=';
    return decodeURIComponent(escape(atob(s)));
}

// ============================================================================
// CIDR MATCHING (for the independent "match known Cloudflare ranges" option)
// ============================================================================

function ipv4ToInt(ip) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null;
    return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function ipv6ToBigInt(ip) {
    let host = ip;
    if (host.includes('::')) {
        const [left, right] = host.split('::');
        const leftParts = left ? left.split(':') : [];
        const rightParts = right ? right.split(':') : [];
        const missing = 8 - leftParts.length - rightParts.length;
        if (missing < 0) return null;
        host = [...leftParts, ...Array(missing).fill('0'), ...rightParts].join(':');
    }
    const groups = host.split(':');
    if (groups.length !== 8) return null;
    let result = 0n;
    for (const g of groups) {
        const v = parseInt(g || '0', 16);
        if (isNaN(v)) return null;
        result = (result << 16n) | BigInt(v);
    }
    return result;
}

function ipInCidr(ip, cidr) {
    try {
        const [range, bitsStr] = cidr.split('/');
        const bits = parseInt(bitsStr, 10);
        if (ip.includes(':') && range.includes(':')) {
            const ipInt = ipv6ToBigInt(ip);
            const rangeInt = ipv6ToBigInt(range);
            if (ipInt === null || rangeInt === null) return false;
            const mask = bits === 0 ? 0n : (~0n << BigInt(128 - bits)) & ((1n << 128n) - 1n);
            return (ipInt & mask) === (rangeInt & mask);
        } else if (!ip.includes(':') && !range.includes(':')) {
            const ipInt = ipv4ToInt(ip);
            const rangeInt = ipv4ToInt(range);
            if (ipInt === null || rangeInt === null) return false;
            const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
            return ((ipInt & mask) >>> 0) === ((rangeInt & mask) >>> 0);
        }
        return false;
    } catch (e) {
        return false;
    }
}

function isKnownCloudflareIp(ip) {
    return CLOUDFLARE_IP_RANGES.some(cidr => ipInCidr(ip, cidr));
}

// ============================================================================
// CONFIG PARSING & FINGERPRINTING
// ============================================================================

function cleanParamValueForFingerprint(value) {
    if (!value) return value;

    // Some panels put a JSON object directly in a param value (not base64),
    // e.g. extra={"mode":"auto","xPaddingBytes":"100-1000"}. Normalize it
    // (sort keys, strip whitespace, strip known-noise keys) the same way as
    // the base64 case below, so whitespace/key-order differences between
    // fetches don't make the same config look "new" every time.
    const trimmed = value.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
            const obj = JSON.parse(trimmed);
            if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                const cleaned = {};
                Object.keys(obj).sort().forEach(k => {
                    if (!KNOWN_NOISE_KEYS.has(k.toLowerCase())) cleaned[k] = obj[k];
                });
                return JSON.stringify(cleaned);
            }
        } catch (e) {
            // not valid JSON after all - fall through to the checks below
        }
    }

    let prefix = '';
    let core = value;
    let suffix = '';
    if (core.startsWith('/')) { prefix = '/'; core = core.slice(1); }
    const qIdx = core.indexOf('?');
    if (qIdx !== -1) { suffix = core.slice(qIdx); core = core.slice(0, qIdx); }

    if (core.length < 8 || !/^[A-Za-z0-9+/_=-]+$/.test(core)) return value;
    try {
        const decoded = base64UrlDecode(core);
        const obj = JSON.parse(decoded);
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return value;
        const cleaned = {};
        Object.keys(obj).sort().forEach(k => {
            if (!KNOWN_NOISE_KEYS.has(k.toLowerCase())) cleaned[k] = obj[k];
        });
        return prefix + JSON.stringify(cleaned) + suffix;
    } catch (e) {
        return value;
    }
}

function buildUriFingerprint(url) {
    const params = new URLSearchParams(url.search);
    const sorted = Array.from(params.entries())
        .map(([k, v]) => [k, cleanParamValueForFingerprint(v)])
        .sort((a, b) => (a[0] !== b[0] ? (a[0] < b[0] ? -1 : 1) : (a[1] < b[1] ? -1 : (a[1] > b[1] ? 1 : 0))));
    const sortedSearch = sorted.map(([k, v]) => k + '=' + v).join('&');
    return [url.protocol, url.username, url.port, url.pathname, sortedSearch].join('|');
}

function buildVmessFingerprint(obj) {
    const clone = Object.assign({}, obj);
    delete clone.add;
    delete clone.ps;
    if (typeof clone.path === 'string') clone.path = cleanParamValueForFingerprint(clone.path);
    const sortedKeys = Object.keys(clone).sort();
    const normalized = {};
    sortedKeys.forEach(k => { normalized[k] = clone[k]; });
    return 'vmess|' + JSON.stringify(normalized);
}

function tryParseVmessLegacy(raw) {
    try {
        const b64 = raw.replace('vmess://', '');
        const jsonStr = decodeURIComponent(escape(atob(b64.replace(/-/g, '+').replace(/_/g, '/'))));
        const obj = JSON.parse(jsonStr);
        if (!obj || typeof obj !== 'object' || !obj.add || !obj.port) return null;
        const isTls = (obj.tls === 'tls' || obj.tls === true);
        return {
            kind: 'vmess-legacy',
            protocol: 'vmess',
            isTls,
            obj,
            fingerprint: buildVmessFingerprint(obj)
        };
    } catch (e) {
        return null;
    }
}

// Parses one config line (vless://, trojan://, ss://, vmess://) into an
// internal representation used everywhere else in this file. Returns null
// if the line isn't a recognizable config.
function parseOneConfigLine(rawLine) {
    const line = (rawLine || '').trim();
    if (!line) return null;

    if (line.startsWith('vmess://')) {
        return tryParseVmessLegacy(line);
    }

    if (line.startsWith('vless://') || line.startsWith('trojan://') || line.startsWith('ss://')) {
        try {
            const url = new URL(line);
            const protocol = url.protocol.replace(':', '');
            const params = new URLSearchParams(url.search);
            const security = params.get('security');
            // Trojan is TLS-by-definition even when the link omits
            // security= entirely (many generators leave it out for trojan
            // specifically, unlike vless where 'none' is a common explicit
            // choice) - so treat trojan as TLS-like regardless of the param.
            const isTls = protocol === 'trojan' || security === 'tls' || security === 'reality';
            return {
                kind: 'uri',
                protocol,
                isTls,
                uri: line,
                fingerprint: buildUriFingerprint(url)
            };
        } catch (e) {
            return null;
        }
    }

    return null;
}

function extractConfigsFromText(text) {
    if (!text) return [];
    const lines = text.split(/\r?\n/);
    const results = [];
    for (const line of lines) {
        const parsed = parseOneConfigLine(line);
        if (parsed) results.push(parsed);
    }
    // Some subscription providers base64-encode their entire body as one
    // blob rather than shipping plain newline-separated URIs - if nothing
    // parsed as-is, try decoding the whole text once and re-splitting.
    if (results.length === 0) {
        try {
            const decoded = base64UrlDecode(text.trim().replace(/-/g, '+').replace(/_/g, '/'));
            const decodedLines = decoded.split(/\r?\n/);
            for (const line of decodedLines) {
                const parsed = parseOneConfigLine(line);
                if (parsed) results.push(parsed);
            }
        } catch (e) {
            // Not a base64 blob either - just return whatever we found (nothing).
        }
    }
    return results;
}

function extractConfigPort(cfg) {
    try {
        if (cfg.kind === 'vmess-legacy') return String(cfg.obj.port || (cfg.isTls ? '443' : '80'));
        const u = new URL(cfg.uri);
        return String(u.port || (cfg.isTls ? '443' : '80'));
    } catch (e) {
        return '?';
    }
}

function extractHostFromConfig(cfg) {
    if (cfg.kind === 'vmess-legacy') return cfg.obj.add || '';
    try {
        return new URL(cfg.uri).hostname.replace(/^\[/, '').replace(/\]$/, '');
    } catch (e) {
        return '';
    }
}

// The literal connect-address (extractHostFromConfig) is often NOT the real
// logical destination for a config sitting behind Cloudflare: providers
// commonly rotate the connect IP/SNI-camouflage domain across many known-good
// Cloudflare addresses while the actual routing to a specific Worker is
// determined by the WebSocket Host header (the 'host' query param) or, for
// non-ws/TLS-terminated setups, the SNI. Two configs with wildly different
// connect hostnames can still be the exact same Worker. This is what
// reduceToOnePerHostPort groups by for 'cloudflare' parts - see there.
function extractLogicalDestination(cfg) {
    if (cfg.kind === 'vmess-legacy') return (cfg.obj.host || cfg.obj.sni || cfg.obj.add || '').toLowerCase();
    try {
        const url = new URL(cfg.uri);
        const params = new URLSearchParams(url.search);
        const host = params.get('host') || params.get('sni') || url.hostname;
        return host.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
    } catch (e) {
        return '';
    }
}

// Host only, no port - the row that shows this already has a separate
// port badge next to the protocol/TLS badges, so repeating the port here
// would just show it twice.
function safeHostPreview(cfg) {
    try {
        if (cfg.kind === 'vmess-legacy') return cfg.obj.add || '?';
        return new URL(cfg.uri).hostname.replace(/^\[/, '').replace(/\]$/, '');
    } catch (e) {
        return 'unknown';
    }
}

// ============================================================================
// PART MODEL: each subscription link, and (at most) one manual block, is a
// fully independent "part" with its own settings - see docstring.
// ============================================================================

function makeNewPart(kind, url, category) {
    const cat = category === 'independent' ? 'independent' : 'cloudflare';
    const part = {
        id: shortId(),
        kind, // 'url' | 'manual'
        url: kind === 'url' ? url : null,
        category: cat,
        useCleanIp: cat === 'cloudflare', // OFF by default for independent - verified by test below
        cleanIpListId: BUILTIN_CLEAN_IP_LIST_ID,
        distribution: 'multiply', // 'multiply' | 'random'
        selectedPorts: [],
        // Reduces the final output to one config per distinct (host, port)
        // pair, randomly chosen among the group - see reduceToOnePerHostPort.
        // Default on for Cloudflare parts, since worker hosts routinely
        // expose the same destination through many near-identical configs.
        oneConfigPerPort: cat === 'cloudflare',
        // Only meaningful for 'independent' parts - see generatePartOutput.
        // Cloudflare parts always replace every host regardless of this field.
        matchKnownRangesOnly: true,
        baseConfigs: [], // fresh-parsed on every fetch - see populatePartConfigs/resyncPart
        blockedFingerprints: [], // the only thing that survives a resync - see isConfigBlocked
        customNamesByFingerprint: {}, // fingerprint -> custom name, survives a resync - see populatePartConfigs
        uploadBoostEnabled: false,
        uploadBoostFingerprint: DEFAULT_UPLOAD_BOOST_FINGERPRINT,
        uploadBoostCipherSuites: DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
        uploadBoostFragmentMask: DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
        truncated: false,
        lastFetchOk: null,
        lastFetchedAt: null
    };
    // Auto-refresh only applies to a part that actually fetches something.
    if (kind === 'url') {
        part.autoRefreshEnabled = true;
        part.autoRefreshMinutes = DEFAULT_AUTO_REFRESH_MINUTES;
    }
    return part;
}

// Rebuilds a part's baseConfigs completely from scratch out of whatever was
// just extracted from a fetch (or a manual paste). No persistent identity,
// no carry-over from whatever was there before - dedup only applies within
// this one batch, so the same config appearing on the next resync is not
// "the same entry", it's just parsed fresh again. Names/numbers are NOT
// assigned here - call assignSequentialNames(source) right after this.
function populatePartConfigs(part, extractedConfigs) {
    part.baseConfigs = [];
    part.truncated = false;
    const customNames = part.customNamesByFingerprint || {};

    const seenInBatch = new Set();
    for (const cfg of extractedConfigs) {
        if (seenInBatch.has(cfg.fingerprint)) continue;
        if (part.baseConfigs.length >= MAX_BASE_CONFIGS_PER_PART) {
            part.truncated = true;
            break;
        }
        cfg.configId = shortId();
        // Custom names are keyed by fingerprint (not configId, which is
        // freshly regenerated every fetch) so a name set by the user
        // survives a resync the same way a blocked fingerprint does.
        if (customNames[cfg.fingerprint]) cfg.customName = customNames[cfg.fingerprint];
        part.baseConfigs.push(cfg);
        seenInBatch.add(cfg.fingerprint);
    }
}

// Walks every part of a source, in order, and assigns cfg.name = "<source
// name> <n>" sequentially (n starting at 1, continuing across parts). This
// is the ONLY place a config's displayed number is computed - there is no
// persistent counter anywhere. Must be called after ANY mutation that adds,
// removes, reorders, or resyncs a part's baseConfigs so numbers always
// match the current on-screen order.
function assignSequentialNames(source) {
    let n = 1;
    (source.parts || []).forEach(part => {
        (part.baseConfigs || []).forEach(cfg => {
            cfg.name = (source.name || 'AutoSub') + ' ' + n;
            n++;
        });
    });
}

// Fingerprint-based block check - the only source of truth for whether a
// config is blocked. See part.blockedFingerprints.
function isConfigBlocked(part, cfg) {
    return (part.blockedFingerprints || []).includes(cfg.fingerprint);
}

// Reconciles a URL part against a fresh fetch: baseConfigs is fully
// replaced by populatePartConfigs (see above - no persistent identity).
// The only thing that survives is part.blockedFingerprints: a fingerprint
// blocked before stays blocked (and still gets a number, so the gap in the
// generated output is meaningful) whether or not this fetch includes it.
function resyncPart(part, extractedConfigs) {
    part.blockedFingerprints = part.blockedFingerprints || [];
    part.customNamesByFingerprint = part.customNamesByFingerprint || {};
    populatePartConfigs(part, extractedConfigs);
}

// ============================================================================
// OUTPUT GENERATION (per part, then combined per source)
// ============================================================================

function applyPortFilter(baseConfigs, selectedPorts) {
    const selected = Array.isArray(selectedPorts) ? selectedPorts.filter(Boolean) : [];
    if (selected.length === 0) return baseConfigs || [];
    const allow = new Set(selected);
    return (baseConfigs || []).filter(cfg => allow.has(extractConfigPort(cfg)));
}

// Groups configs by their real logical destination AND port, and keeps
// exactly one randomly-chosen representative per group for the final
// output. For 'cloudflare' parts, the host side of the key is the logical
// destination (see extractLogicalDestination) rather than the literal
// connect-address, since providers commonly rotate the connect IP/SNI-
// camouflage domain across many addresses while 'host'/'sni' is what
// actually stays constant for a given Worker - so those rotated variants of
// the exact same (Worker, port) pair collapse into one. Port still matters
// on both sides: selecting an additional edge port for a source is a
// deliberate choice to get more variety in the output, not noise to be
// collapsed away, so two otherwise-identical configs on different ports are
// kept as separate groups. Does not touch part.baseConfigs - only narrows
// what generatePartOutput uses for this run.
function reduceToOnePerHostPort(baseConfigs, category) {
    const groups = new Map();
    (baseConfigs || []).forEach(cfg => {
        const host = category === 'cloudflare' ? extractLogicalDestination(cfg) : (extractHostFromConfig(cfg) || '').toLowerCase();
        const key = host + '|' + extractConfigPort(cfg);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(cfg);
    });
    const result = [];
    groups.forEach(group => {
        result.push(group[Math.floor(Math.random() * group.length)]);
    });
    return result;
}

// Per-port emoji for the display name (cosmetic). Independent configs get
// one neutral emoji since the port pools below are Cloudflare-specific.
const CLOUDFLARE_TLS_PORT_EMOJIS = { '443': '🔒', '2053': '🛡️', '2083': '💎', '2087': '🚀', '2096': '⚡', '8443': '⭐' };
const CLOUDFLARE_NONTLS_PORT_EMOJIS = { '80': '🔓', '8080': '🌊', '8880': '🍃', '2052': '🌙', '2082': '🔥', '2086': '🦋', '2095': '🍀' };
const INDEPENDENT_EMOJI = '🌐';
const UNKNOWN_PORT_EMOJI = '🔹';

function getConfigEmoji(base, category) {
    if (category === 'independent') return INDEPENDENT_EMOJI;
    const port = extractConfigPort(base);
    if (base.isTls) return CLOUDFLARE_TLS_PORT_EMOJIS[port] || UNKNOWN_PORT_EMOJI;
    return CLOUDFLARE_NONTLS_PORT_EMOJIS[port] || UNKNOWN_PORT_EMOJI;
}

// "<emoji> <source name> <n>" - or the user's custom override, if they set
// one for this specific config (see handleSetConfigCustomName). The custom
// name is keyed by fingerprint in part.customNamesByFingerprint, so it
// survives a resync (populatePartConfigs reattaches it to the fresh config
// object with the same fingerprint) the same way a blocked fingerprint does.
function buildDisplayName(base, category) {
    return getConfigEmoji(base, category) + ' ' + (base.customName || base.name);
}

// TLS ClientHello fingerprint/cipher-suite/fragment spoofing, aimed at
// defeating JA3/JA4-style DPI classification of proxy traffic - method and
// default parameter values from Patternia. Only touches VLESS/Trojan
// configs that already have security=tls or security=reality; everything
// else (including security=none, and non-VLESS/Trojan protocols) passes
// through unchanged. `cs`/`fm` reshape the plaintext ClientHello itself, so
// they only make sense for security=tls - under REALITY the handshake is a
// verbatim copy of a real site's, with no client-shaped ClientHello for
// these to act on. `fp` (the uTLS fingerprint choice) still applies to
// REALITY, since REALITY still needs to pick one to mimic.
function applyUploadBoost(configUri, partSettings) {
    if (!partSettings || !partSettings.uploadBoostEnabled) return configUri;
    try {
        const url = new URL(configUri);
        const protocol = url.protocol.replace(':', '');
        if (protocol !== 'vless' && protocol !== 'trojan') return configUri;

        const params = new URLSearchParams(url.search);
        const security = params.get('security');
        const isTlsLike = protocol === 'trojan' || security === 'tls' || security === 'reality';
        if (!isTlsLike) return configUri;

        const fp = partSettings.uploadBoostFingerprint;
        if (fp && fp !== 'none') params.set('fp', fp);

        if (security !== 'reality') {
            const cs = partSettings.uploadBoostCipherSuites;
            if (cs) params.set('cs', cs);
            const fm = partSettings.uploadBoostFragmentMask;
            if (fm) params.set('fm', fm);
        }

        url.search = params.toString().replace(/\+/g, '%20');
        return url.toString();
    } catch (e) {
        return configUri;
    }
}

function applyHostToConfig(base, rawIp, category, partSettings) {
    const ip = normalizeHostForUrl(rawIp);
    const displayName = buildDisplayName(base, category);
    if (base.kind === 'vmess-legacy') {
        const originalAdd = base.obj.add || '';
        const newObj = Object.assign({}, base.obj, { add: rawIp.trim(), ps: displayName });
        if (base.isTls && !newObj.sni) newObj.sni = originalAdd;
        if (newObj.net === 'ws' && !newObj.host) newObj.host = originalAdd;
        return 'vmess://' + btoa(unescape(encodeURIComponent(JSON.stringify(newObj))));
    }
    const origUrl = new URL(base.uri);
    const params = new URLSearchParams(origUrl.search);
    const newUrl = new URL(base.uri);
    newUrl.hostname = ip;
    const security = params.get('security');
    const protocol = origUrl.protocol.replace(':', '');
    const needsSni = protocol === 'trojan' || security === 'tls' || security === 'reality';
    if (!params.has('sni') && needsSni) params.set('sni', origUrl.hostname.replace(/^\[/, '').replace(/\]$/, ''));
    if (!params.has('host') && params.get('type') === 'ws') params.set('host', origUrl.hostname);
    newUrl.search = params.toString();
    newUrl.hash = encodeURIComponent(displayName);
    return applyUploadBoost(newUrl.toString(), partSettings);
}

// Normalizes the display name even when the host isn't touched, so it's
// never the provider's own (untrustworthy) remark. Also fully re-encodes
// the query string via URLSearchParams (same reasoning as applyHostToConfig).
function passThroughConfig(base, category, partSettings) {
    const displayName = buildDisplayName(base, category);
    if (base.kind === 'vmess-legacy') {
        const newObj = Object.assign({}, base.obj, { ps: displayName });
        return 'vmess://' + btoa(unescape(encodeURIComponent(JSON.stringify(newObj))));
    }
    const newUrl = new URL(base.uri);
    const params = new URLSearchParams(newUrl.search);
    newUrl.search = params.toString();
    newUrl.hash = encodeURIComponent(displayName);
    return applyUploadBoost(newUrl.toString(), partSettings);
}

function buildOriginalConfigs(baseConfigs, category, partSettings) {
    const out = [];
    (baseConfigs || []).forEach(base => {
        try { out.push(passThroughConfig(base, category, partSettings)); } catch (e) { /* skip broken entry */ }
    });
    return out;
}

function splitByKnownRanges(baseConfigs) {
    const inRange = [];
    const outOfRange = [];
    (baseConfigs || []).forEach(cfg => {
        const host = extractHostFromConfig(cfg);
        if (host && isKnownCloudflareIp(host)) inRange.push(cfg);
        else outOfRange.push(cfg);
    });
    return { inRange, outOfRange };
}

function applyCleanIpToConfigs(baseConfigs, cleanIps, distribution, category, partSettings) {
    const safeIps = (Array.isArray(cleanIps) ? cleanIps : []).filter(Boolean);
    const out = [];
    if (safeIps.length === 0) return out;

    (baseConfigs || []).forEach(base => {
        try {
            if (distribution === 'random') {
                const ip = safeIps[Math.floor(Math.random() * safeIps.length)];
                out.push(applyHostToConfig(base, ip, category, partSettings));
            } else {
                safeIps.forEach(ip => out.push(applyHostToConfig(base, ip, category, partSettings)));
            }
        } catch (e) {
            // skip this broken combination
        }
    });
    return out;
}

function findCleanIpList(settings, listId) {
    return settings.cleanIpLists.find(l => l.id === listId)
        || settings.cleanIpLists.find(l => l.id === BUILTIN_CLEAN_IP_LIST_ID)
        || settings.cleanIpLists[0];
}

function buildPartSettings(part) {
    return {
        uploadBoostEnabled: !!part.uploadBoostEnabled,
        uploadBoostFingerprint: part.uploadBoostFingerprint || DEFAULT_UPLOAD_BOOST_FINGERPRINT,
        uploadBoostCipherSuites: part.uploadBoostCipherSuites || DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
        uploadBoostFragmentMask: part.uploadBoostFragmentMask || DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK
    };
}

// Used when a part's projected output would exceed MAX_FINAL_CONFIGS_PER_PART
// (see generatePartOutput): rather than producing zero configs for the whole
// part, keep a random subset up to the cap so the source still has usable
// output, and surface a non-fatal warning so the admin can see it happened.
function randomSampleCapped(arr, capCount) {
    if (!arr || arr.length <= capCount) return arr || [];
    const pool = arr.slice();
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    return pool.slice(0, Math.max(0, capCount));
}

function generatePartOutput(part, settings) {
    const unblocked = (part.baseConfigs || []).filter(c => !isConfigBlocked(part, c));
    let filtered = applyPortFilter(unblocked, part.selectedPorts);
    if (part.oneConfigPerPort) filtered = reduceToOnePerHostPort(filtered, part.category);


    const partSettings = buildPartSettings(part);

    if (!part.useCleanIp) {
        return { lines: buildOriginalConfigs(filtered, part.category, partSettings), error: null };
    }

    const list = findCleanIpList(settings, part.cleanIpListId);
    const cleanIps = (list.ips || []).filter(Boolean);
    const distribution = part.distribution === 'random' ? 'random' : 'multiply';

    // useCleanIp is on but the selected list has nothing in it - passing
    // the original configs through unfiltered is much safer than silently
    // returning zero lines (which would look identical to "everything
    // blocked" or "no configs at all" with no indication of why).
    if (cleanIps.length === 0) {
        return { lines: buildOriginalConfigs(filtered, part.category, partSettings), error: 'CLEAN_IP_LIST_EMPTY', errorParams: null };
    }

    // matchKnownRangesOnly only applies to 'independent' parts: when on
    // (the default), it only swaps the host of configs whose CURRENT host
    // is already a known Cloudflare IP, leaving anything else untouched -
    // the safe default, since blindly rewriting the host of a server that
    // was never behind Cloudflare would just break it. Turning it off
    // replaces every config's host in the part regardless of what it
    // currently is. 'cloudflare' parts always behave as if this were off:
    // a worker's host (even a domain, not a raw IP) ultimately resolves
    // behind Cloudflare anyway, and the known-ranges check only recognizes
    // literal IPs, so honoring it here would just silently skip most hosts.
    if (part.category !== 'cloudflare' && part.matchKnownRangesOnly !== false) {
        const { inRange, outOfRange } = splitByKnownRanges(filtered);
        const projected = distribution === 'random' ? inRange.length : inRange.length * cleanIps.length;
        const capCount = distribution === 'random' ? MAX_FINAL_CONFIGS_PER_PART : Math.max(1, Math.floor(MAX_FINAL_CONFIGS_PER_PART / cleanIps.length));
        const usedInRange = projected > MAX_FINAL_CONFIGS_PER_PART ? randomSampleCapped(inRange, capCount) : inRange;
        const result = { lines: applyCleanIpToConfigs(usedInRange, cleanIps, distribution, part.category, partSettings).concat(buildOriginalConfigs(outOfRange, part.category, partSettings)), error: null };
        if (projected > MAX_FINAL_CONFIGS_PER_PART) {
            result.error = 'PART_OUTPUT_TRUNCATED';
            result.errorParams = { kept: usedInRange.length, total: inRange.length, limit: MAX_FINAL_CONFIGS_PER_PART };
        }
        return result;
    }

    const projected = distribution === 'random' ? filtered.length : filtered.length * cleanIps.length;
    const capCount = distribution === 'random' ? MAX_FINAL_CONFIGS_PER_PART : Math.max(1, Math.floor(MAX_FINAL_CONFIGS_PER_PART / cleanIps.length));
    const used = projected > MAX_FINAL_CONFIGS_PER_PART ? randomSampleCapped(filtered, capCount) : filtered;
    const result = { lines: applyCleanIpToConfigs(used, cleanIps, distribution, part.category, partSettings), error: null };
    if (projected > MAX_FINAL_CONFIGS_PER_PART) {
        result.error = 'PART_OUTPUT_TRUNCATED';
        result.errorParams = { kept: used.length, total: filtered.length, limit: MAX_FINAL_CONFIGS_PER_PART };
    }
    return result;
}

function generateSourceOutput(source, settings) {
    const allLines = [];
    const partWarnings = [];
    (source.parts || []).forEach(part => {
        const result = generatePartOutput(part, settings);
        if (result.error) partWarnings.push({ partId: part.id, message: result.error, params: result.errorParams || null });
        if (result.lines) allLines.push(...result.lines);
    });
    return { configs: allLines, partWarnings };
}

// ============================================================================
// STORAGE
// ============================================================================

async function getSettings(env) {
    const defaults = {
        cleanIpLists: [{ id: BUILTIN_CLEAN_IP_LIST_ID, name: 'لیست پیش‌فرض پنل', ips: DEFAULT_CLEAN_IPS.slice(), builtin: true }],
        cfConnections: []
    };
    try {
        const raw = await env.SUB_DB.get("APP_SETTINGS");
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        const merged = Object.assign({}, defaults, parsed);
        if (!Array.isArray(merged.cfConnections)) merged.cfConnections = [];
        if (!Array.isArray(merged.cleanIpLists) || merged.cleanIpLists.length === 0) {
            merged.cleanIpLists = defaults.cleanIpLists;
        }
        if (!merged.cleanIpLists.some(l => l.id === BUILTIN_CLEAN_IP_LIST_ID)) {
            merged.cleanIpLists.unshift(defaults.cleanIpLists[0]);
        }
        return merged;
    } catch (e) {
        return defaults;
    }
}

async function saveSettings(settings, env) {
    await env.SUB_DB.put("APP_SETTINGS", JSON.stringify(settings));
}

// Clamps a stored/imported minutes value into the sane range - so a
// hand-edited backup file or a future version with a different default
// can never leave a part refreshing absurdly often or never at all.
function clampAutoRefreshMinutes(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT_AUTO_REFRESH_MINUTES;
    return Math.min(MAX_AUTO_REFRESH_MINUTES, Math.max(MIN_AUTO_REFRESH_MINUTES, Math.round(n)));
}

// Fills in defaults for fields that may be missing on a source (or one of
// its parts) loaded from KV - either because it predates a given field
// (this panel is designed to gain fields across versions without breaking
// old data, see the backup section) or because it just came in through an
// import. Called on every read so the rest of the codebase never has to
// think about "what if this field isn't there". Auto-refresh is a per-part
// setting - only URL parts actually fetch anything, so it's meaningless on
// a manual part and left alone there.
function normalizeSourceShape(source) {
    // Every source needs a slug for its public link (see makeUniqueSlug).
    // A source loaded from before this field existed (or an older backup -
    // see normalizeImportedBackup) falls back to its own id, which is
    // guaranteed unique and already fits the slug character rules. This
    // fallback only fixes up the in-memory object; it does NOT write a KV
    // index entry (getSources() is a read path and shouldn't have side
    // effects) - handleServeSubscription's fallback-to-raw-id lookup
    // covers exactly this case, so the link keeps working either way.
    if (!source.slug) source.slug = source.id;
    (source.parts || []).forEach(part => {
        if (part.kind === 'url') {
            if (part.autoRefreshEnabled === undefined) part.autoRefreshEnabled = true;
            else part.autoRefreshEnabled = !!part.autoRefreshEnabled;
            part.autoRefreshMinutes = clampAutoRefreshMinutes(part.autoRefreshMinutes !== undefined ? part.autoRefreshMinutes : DEFAULT_AUTO_REFRESH_MINUTES);
        }
        // Pin down a real boolean once and for all - generatePartOutput
        // treats anything falsy (including undefined) as off, so any code
        // path that instead reported "not explicitly false = on" (like the
        // config list API) would show the wrong state for a part whose
        // field was never set (only possible via very old data/backups).
        if (typeof part.useCleanIp !== 'boolean') part.useCleanIp = part.category !== 'independent';
        if (!part.customNamesByFingerprint || typeof part.customNamesByFingerprint !== 'object') part.customNamesByFingerprint = {};
        if (part.uploadBoostEnabled === undefined) part.uploadBoostEnabled = false;
        else part.uploadBoostEnabled = !!part.uploadBoostEnabled;
        if (typeof part.uploadBoostFingerprint !== 'string') part.uploadBoostFingerprint = DEFAULT_UPLOAD_BOOST_FINGERPRINT;
        if (typeof part.uploadBoostCipherSuites !== 'string') part.uploadBoostCipherSuites = DEFAULT_UPLOAD_BOOST_CIPHER_SUITES;
        if (typeof part.uploadBoostFragmentMask !== 'string') part.uploadBoostFragmentMask = DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK;
    });
    return source;
}

async function getSources(env) {
    try {
        const raw = await env.SUB_DB.get("SOURCES");
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(normalizeSourceShape) : [];
    } catch (e) {
        return [];
    }
}

async function saveSources(sources, env) {
    await env.SUB_DB.put("SOURCES", JSON.stringify(sources));
}

// ============================================================================
// BACKUP: export / import everything (sources, clean-IP lists, CF
// connections) as one portable JSON file. This is the ONLY supported way
// to move a setup to a new worker or share it, and it's also the "undo"
// for anyone about to try something risky in the panel.
//
// Forward-compatibility contract: importBackupData() must accept a backup
// produced by this version AND by any earlier version. It does this by
// only reading fields it understands and defaulting everything else via
// the normal getSettings()/getSources() shape-repair logic - so future
// versions can freely add new fields to sources/parts/settings without
// breaking old backups on import, and old backups just come in without
// those newer fields (which then take their normal defaults).
// ============================================================================

const BACKUP_SECTION_KEYS = ['sources', 'cleanIpLists', 'cfConnections'];

async function buildBackupData(env, sections) {
    const wantSources = sections.has('sources');
    const wantCleanIpLists = sections.has('cleanIpLists');
    const wantCfConnections = sections.has('cfConnections');
    const sources = wantSources ? await getSources(env) : [];
    const settings = await getSettings(env);
    return {
        backupFormatVersion: BACKUP_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        // Which sections this file actually carries real data for - lets
        // import tell "this section was deliberately left out at export
        // time" apart from "this section is just empty". A file from before
        // this field existed has none, so it's treated as carrying all
        // three (see normalizeImportedBackup / handleImportBackup) - the
        // only shape older backups ever had.
        sectionsIncluded: Array.from(sections),
        sources,
        settings: {
            cleanIpLists: wantCleanIpLists ? settings.cleanIpLists : [],
            cfConnections: wantCfConnections ? settings.cfConnections : []
        }
    };
}

async function handleExportBackup(env, request) {
    try {
        const url = new URL(request.url);
        const requested = (url.searchParams.get('sections') || '').split(',').map(s => s.trim()).filter(Boolean);
        const sections = new Set(requested.filter(s => BACKUP_SECTION_KEYS.includes(s)));
        if (sections.size === 0) BACKUP_SECTION_KEYS.forEach(k => sections.add(k));
        const backup = await buildBackupData(env, sections);
        return new Response(JSON.stringify(backup, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Disposition': `attachment; filename="sub-manager-backup-${new Date().toISOString().slice(0, 10)}.json"`
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'EXPORT_FAILED' }), { status: 500 });
    }
}

// Accepts a backup object of unknown origin (any past version, or a
// hand-edited file) and returns a { sources, settings } pair that's safe
// to persist - or throws if the input isn't recognizable as a backup at
// all. Every field is read defensively; nothing here trusts the shape of
// the input beyond "is it an object".
// Re-derives a config entry from a backup file's raw data rather than
// trusting it outright - a hand-edited or malicious backup could otherwise
// smuggle an arbitrary 'uri' (e.g. a javascript: URL) straight through to
// the generated subscription output. Returns null if the entry can't be
// re-parsed into a recognizable config at all.
function revalidateImportedConfig(c) {
    if (!c || typeof c !== 'object') return null;
    let rebuilt = null;
    if (c.kind === 'uri' && typeof c.uri === 'string') {
        rebuilt = parseOneConfigLine(c.uri);
    } else if (c.kind === 'vmess-legacy' && c.obj && typeof c.obj === 'object' && c.obj.add && c.obj.port) {
        rebuilt = tryParseVmessLegacy('vmess://' + btoa(unescape(encodeURIComponent(JSON.stringify(c.obj)))));
    }
    if (!rebuilt) return null;
    rebuilt.configId = typeof c.configId === 'string' && c.configId ? c.configId : shortId();
    if (c.customName) rebuilt.customName = String(c.customName).trim().slice(0, MAX_CUSTOM_NAME_LENGTH) || undefined;
    return rebuilt;
}

function normalizeImportedBackup(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('invalid backup file');

    const sources = Array.isArray(raw.sources) ? raw.sources : [];
    const normalizedSources = sources.filter(s => s && typeof s === 'object' && typeof s.id === 'string').map(s => ({
        id: s.id,
        // A backup taken before the slug field existed has none - normalizeSourceShape
        // backfills it to the source's own id the next time this is read via
        // getSources(), same as any other legacy source, so it's left out here
        // and picked up uniformly right after import (see importBackupData's caller).
        // A slug that fails format validation (e.g. from a hand-edited backup)
        // is dropped the same way, rather than trusted as-is - it ends up
        // rendered into an HTML attribute in the panel, so anything outside
        // the normal a-zA-Z0-9_- charset must never survive import.
        slug: (typeof s.slug === 'string' && isValidSlugFormat(s.slug)) ? s.slug : undefined,
        name: typeof s.name === 'string' ? s.name : 'منبع بازیابی‌شده',
        createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
        lastSync: typeof s.lastSync === 'string' ? s.lastSync : null,
        parts: Array.isArray(s.parts) ? s.parts.filter(p => p && typeof p === 'object' && typeof p.id === 'string').map(p => {
            const kind = p.kind === 'manual' ? 'manual' : 'url';
            const category = p.category === 'independent' ? 'independent' : 'cloudflare';
            const part = {
                id: p.id,
                kind,
                url: typeof p.url === 'string' ? p.url : null,
                category,
                useCleanIp: typeof p.useCleanIp === 'boolean' ? p.useCleanIp : category === 'cloudflare',
                cleanIpListId: typeof p.cleanIpListId === 'string' ? p.cleanIpListId : BUILTIN_CLEAN_IP_LIST_ID,
                distribution: p.distribution === 'random' ? 'random' : 'multiply',
                selectedPorts: Array.isArray(p.selectedPorts) ? p.selectedPorts.map(String).filter(Boolean) : [],
                oneConfigPerPort: !!p.oneConfigPerPort,
                matchKnownRangesOnly: p.matchKnownRangesOnly !== false,
                baseConfigs: Array.isArray(p.baseConfigs) ? p.baseConfigs.map(revalidateImportedConfig).filter(Boolean).slice(0, MAX_BASE_CONFIGS_PER_PART) : [],
                blockedFingerprints: Array.isArray(p.blockedFingerprints) ? p.blockedFingerprints.filter(f => typeof f === 'string') : [],
                customNamesByFingerprint: (p.customNamesByFingerprint && typeof p.customNamesByFingerprint === 'object')
                    ? Object.fromEntries(Object.entries(p.customNamesByFingerprint).filter(([k, v]) => typeof k === 'string' && typeof v === 'string' && v).map(([k, v]) => [k, v.trim().slice(0, MAX_CUSTOM_NAME_LENGTH)]))
                    : {},
                uploadBoostEnabled: !!p.uploadBoostEnabled,
                uploadBoostFingerprint: typeof p.uploadBoostFingerprint === 'string' ? p.uploadBoostFingerprint : DEFAULT_UPLOAD_BOOST_FINGERPRINT,
                uploadBoostCipherSuites: typeof p.uploadBoostCipherSuites === 'string' ? p.uploadBoostCipherSuites : DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
                uploadBoostFragmentMask: typeof p.uploadBoostFragmentMask === 'string' ? p.uploadBoostFragmentMask : DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
                truncated: !!p.truncated,
                lastFetchOk: typeof p.lastFetchOk === 'boolean' ? p.lastFetchOk : null,
                lastFetchedAt: typeof p.lastFetchedAt === 'string' ? p.lastFetchedAt : null
            };
            if (kind === 'url') {
                part.autoRefreshEnabled = p.autoRefreshEnabled !== false;
                part.autoRefreshMinutes = clampAutoRefreshMinutes(p.autoRefreshMinutes !== undefined ? p.autoRefreshMinutes : DEFAULT_AUTO_REFRESH_MINUTES);
            }
            return part;
        }) : []
    }));

    // Names are always recomputed fresh on import too - see
    // assignSequentialNames(). We never trust a stored name/number as-is.
    normalizedSources.forEach(assignSequentialNames);

    const rawSettings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    const normalizedSettings = {
        cleanIpLists: Array.isArray(rawSettings.cleanIpLists) && rawSettings.cleanIpLists.length > 0
            ? rawSettings.cleanIpLists.filter(l => l && typeof l === 'object' && typeof l.id === 'string').map(l => ({
                id: l.id,
                name: typeof l.name === 'string' ? l.name : 'لیست بازیابی‌شده',
                ips: Array.isArray(l.ips) ? l.ips.map(String).filter(Boolean) : [],
                builtin: l.id === BUILTIN_CLEAN_IP_LIST_ID
            }))
            : [{ id: BUILTIN_CLEAN_IP_LIST_ID, name: 'لیست پیش‌فرض پنل', ips: DEFAULT_CLEAN_IPS.slice(), builtin: true }],
        cfConnections: Array.isArray(rawSettings.cfConnections) ? rawSettings.cfConnections.filter(c => c && typeof c === 'object' && typeof c.id === 'string').map(c => ({
            id: c.id,
            label: typeof c.label === 'string' ? c.label : 'اکانت کلودفلر',
            accountId: typeof c.accountId === 'string' ? c.accountId : '',
            apiToken: typeof c.apiToken === 'string' ? c.apiToken : ''
        })) : []
    };
    if (!normalizedSettings.cleanIpLists.some(l => l.id === BUILTIN_CLEAN_IP_LIST_ID)) {
        normalizedSettings.cleanIpLists.unshift({ id: BUILTIN_CLEAN_IP_LIST_ID, name: 'لیست پیش‌فرض پنل', ips: DEFAULT_CLEAN_IPS.slice(), builtin: true });
    }

    return { sources: normalizedSources, settings: normalizedSettings };
}

async function handleImportBackup(request, env, ctx) {
    try {
        const raw = await request.json();
        const mode = raw && raw.__importMode === 'merge' ? 'merge' : 'replace';

        // What the person asked to import (checkboxes in the panel) intersected
        // with what the file actually carries (sectionsIncluded) - a section
        // absent from either side is left completely untouched in KV, not
        // cleared or replaced with a default.
        const requestedSections = Array.isArray(raw && raw.__importSections) && raw.__importSections.length > 0
            ? new Set(raw.__importSections.filter(s => BACKUP_SECTION_KEYS.includes(s)))
            : new Set(BACKUP_SECTION_KEYS);
        const sectionsInFile = Array.isArray(raw && raw.sectionsIncluded)
            ? new Set(raw.sectionsIncluded.filter(s => BACKUP_SECTION_KEYS.includes(s)))
            : new Set(BACKUP_SECTION_KEYS); // pre-this-feature backups always had everything

        const importSources = requestedSections.has('sources') && sectionsInFile.has('sources');
        const importCleanIpLists = requestedSections.has('cleanIpLists') && sectionsInFile.has('cleanIpLists');
        const importCfConnections = requestedSections.has('cfConnections') && sectionsInFile.has('cfConnections');

        const normalized = normalizeImportedBackup(raw);
        const existingSources = await getSources(env);
        const existingSettings = await getSettings(env);

        let finalSources = existingSources;
        let sourcesToRegenerate = [];
        if (importSources) {
            if (mode === 'replace') {
                finalSources = normalized.sources;
                sourcesToRegenerate = normalized.sources;
            } else {
                const existingIds = new Set(existingSources.map(s => s.id));
                const toAdd = normalized.sources.filter(s => !existingIds.has(s.id));
                finalSources = existingSources.concat(toAdd);
                sourcesToRegenerate = toAdd;
            }
        }

        let finalCleanIpLists = existingSettings.cleanIpLists;
        let listsImportedCount = 0;
        if (importCleanIpLists) {
            if (mode === 'replace') {
                finalCleanIpLists = normalized.settings.cleanIpLists;
                listsImportedCount = finalCleanIpLists.filter(l => l.id !== BUILTIN_CLEAN_IP_LIST_ID).length;
            } else {
                const existingListIds = new Set(existingSettings.cleanIpLists.map(l => l.id));
                const listsToAdd = normalized.settings.cleanIpLists.filter(l => !existingListIds.has(l.id) && l.id !== BUILTIN_CLEAN_IP_LIST_ID);
                finalCleanIpLists = existingSettings.cleanIpLists.concat(listsToAdd);
                listsImportedCount = listsToAdd.length;
            }
        }
        if (!finalCleanIpLists.some(l => l.id === BUILTIN_CLEAN_IP_LIST_ID)) {
            finalCleanIpLists = [{ id: BUILTIN_CLEAN_IP_LIST_ID, name: 'لیست پیش‌فرض پنل', ips: DEFAULT_CLEAN_IPS.slice(), builtin: true }].concat(finalCleanIpLists);
        }

        let finalCfConnections = existingSettings.cfConnections;
        let cfImportedCount = 0;
        if (importCfConnections) {
            if (mode === 'replace') {
                finalCfConnections = normalized.settings.cfConnections;
                cfImportedCount = finalCfConnections.length;
            } else {
                const existingConnIds = new Set(existingSettings.cfConnections.map(c => c.id));
                const cfToAdd = normalized.settings.cfConnections.filter(c => !existingConnIds.has(c.id));
                finalCfConnections = existingSettings.cfConnections.concat(cfToAdd);
                cfImportedCount = cfToAdd.length;
            }
        }

        const finalSettings = { cleanIpLists: finalCleanIpLists, cfConnections: finalCfConnections };

        if (importSources) {
            // Every source needs a slug, and no two sources anywhere (old or
            // newly imported) can share one - the slug index (slugidx_{slug} ->
            // id in KV) would otherwise point at the wrong source. A missing or
            // colliding slug on an imported source is silently replaced with a
            // fresh unique one rather than rejecting the whole import over it;
            // the person can always rename it afterward from the editor.
            const seenSlugs = new Set();
            finalSources.forEach(source => {
                if (!source.slug || seenSlugs.has(source.slug)) {
                    let candidate = makeSlug();
                    while (seenSlugs.has(candidate)) candidate = makeSlug();
                    source.slug = candidate;
                }
                seenSlugs.add(source.slug);
            });

            // A 'replace' of the sources section drops whatever isn't in the
            // file - clean up that source's leftover KV entries too (its
            // generated output blob and its slug index), or they'd sit there
            // forever as orphaned, unreachable data.
            if (mode === 'replace') {
                const newIds = new Set(finalSources.map(s => s.id));
                const removed = existingSources.filter(s => !newIds.has(s.id));
                for (const s of removed) {
                    await env.SUB_DB.delete(`out_${s.id}`);
                    if (s.slug) await env.SUB_DB.delete(`slugidx_${s.slug}`);
                }
            }
        }

        await saveSources(finalSources, env);
        await saveSettings(finalSettings, env);

        if (importSources) {
            for (const source of finalSources) {
                await env.SUB_DB.put(`slugidx_${source.slug}`, source.id);
            }
            // Only regenerate output for sources actually touched by this
            // import (all of them on 'replace', just the newly-added ones on
            // 'merge') rather than every source in the panel every time.
            for (const source of sourcesToRegenerate) {
                await regenerateSourceOutput(source, finalSettings, env);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            sourcesImported: sourcesToRegenerate.length,
            listsImported: listsImportedCount,
            cfConnectionsImported: cfImportedCount
        }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'IMPORT_INVALID_BACKUP' }), { status: 400 });
    }
}

// The public /sub/{slug} endpoint doesn't load the full source (see
// handleServeSubscription - it only reads the pre-generated out_{id} blob,
// on purpose, to keep that hot path cheap). So at generation time we
// pre-compute a single "when should this source next be auto-refreshed"
// timestamp across all of its url parts, and store just that. Returns null
// if the source has no url part that's actually due to auto-refresh
// (e.g. it's fully manual, or every url part has auto-refresh turned off) -
// meaning the public endpoint should never trigger a background fetch for it.
function computeNextAutoRefreshDueAt(source) {
    let earliest = null;
    (source.parts || []).forEach(part => {
        if (part.kind !== 'url' || part.autoRefreshEnabled === false) return;
        const intervalMs = clampAutoRefreshMinutes(part.autoRefreshMinutes) * 60 * 1000;
        const lastFetchedAt = part.lastFetchedAt ? new Date(part.lastFetchedAt).getTime() : 0;
        const dueAt = lastFetchedAt + intervalMs;
        if (earliest === null || dueAt < earliest) earliest = dueAt;
    });
    return earliest === null ? null : new Date(earliest).toISOString();
}

// The smallest autoRefreshMinutes among this source's enabled url parts -
// used as the Profile-Update-Interval hint sent to the client app (see
// handleServeSubscription). A source with several links can have different
// intervals per link; the client only gets one number for the whole
// subscription, so the shortest (most eager) one is the honest choice.
function computeSourceUpdateIntervalMinutes(source) {
    let smallest = null;
    (source.parts || []).forEach(part => {
        if (part.kind !== 'url' || part.autoRefreshEnabled === false) return;
        const minutes = clampAutoRefreshMinutes(part.autoRefreshMinutes);
        if (smallest === null || minutes < smallest) smallest = minutes;
    });
    return smallest === null ? DEFAULT_AUTO_REFRESH_MINUTES : smallest;
}

async function regenerateSourceOutput(source, settings, env) {
    const result = generateSourceOutput(source, settings);
    const outputData = {
        id: source.id,
        name: source.name,
        updatedAt: new Date().toISOString(),
        configs: (result.configs || []).join('\n'),
        partWarnings: result.partWarnings || [],
        nextAutoRefreshDueAt: computeNextAutoRefreshDueAt(source),
        updateIntervalMinutes: computeSourceUpdateIntervalMinutes(source)
    };
    try {
        await env.SUB_DB.put(`out_${source.id}`, JSON.stringify(outputData));
    } catch (e) {
        // keep whatever existed before if the write fails
    }
}

// ============================================================================
// SYNC
// ============================================================================

async function fetchSubscriptionContent(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUBSCRIPTION_FETCH_TIMEOUT_MS);
    try {
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SubManager/1.0)' }, signal: controller.signal });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return await resp.text();
    } finally {
        clearTimeout(timeout);
    }
}

// Shared by both "add a new url part" (a first fetch, via populatePartConfigs
// - nothing to preserve yet) and "resync an existing url part" (via
// resyncPart, which additionally carries part.blockedFingerprints forward -
// see its own comment). Always stamps lastFetchedAt and lastFetchOk
// afterward, success or failure, since both feed
// computeNextAutoRefreshDueAt's staleness math - a part that was never
// stamped would look infinitely overdue and get an unnecessary extra fetch
// on its very first /sub/{slug} request.
async function fetchAndPopulatePart(part, isResync) {
    try {
        const rawText = await fetchSubscriptionContent(part.url);
        const extracted = rawText ? extractConfigsFromText(rawText) : [];

        // If a resync comes back with zero usable configs but the part
        // already had some, we deliberately keep the old ones and just flag
        // the fetch as failed - a subscription URL temporarily returning an
        // error page, a login wall, or an empty body should never silently
        // wipe out a working part. A genuinely empty subscription (nothing
        // to keep) or the very first fetch of a brand-new part still goes
        // through normally.
        if (isResync && extracted.length === 0 && (part.baseConfigs || []).length > 0) {
            part.lastFetchOk = false;
        } else {
            if (isResync) resyncPart(part, extracted);
            else populatePartConfigs(part, extracted);
            part.lastFetchOk = extracted.length > 0;
        }
    } catch (e) {
        part.lastFetchOk = false;
    }
    part.lastFetchedAt = new Date().toISOString();
}

// Refreshes the URL parts of a single source.
//   mode 'manual' (default): re-fetches EVERY url part, ignoring each
//     part's autoRefreshEnabled/interval - this is what an explicit user
//     action (the "sync" button, "sync all") means: check right now,
//     regardless of settings.
//   mode 'auto': only re-fetches a url part if its own autoRefreshEnabled
//     is not false AND it's actually due (now - lastFetchedAt exceeds its
//     own autoRefreshMinutes). Used by the Cron Trigger and by the
//     background refresh kicked off from the public /sub/{slug} endpoint.
// Manual parts are never touched here either way - there's nothing to
// fetch for them.
async function syncSingleSourceLogic(source, settings, env, mode) {
    const isAuto = mode === 'auto';
    const now = Date.now();
    source.parts = source.parts || [];
    let anyPartFetched = false;
    for (const part of source.parts) {
        if (part.kind !== 'url' || !part.url) continue;
        if (isAuto) {
            if (part.autoRefreshEnabled === false) continue;
            const intervalMs = clampAutoRefreshMinutes(part.autoRefreshMinutes) * 60 * 1000;
            const lastFetchedAt = part.lastFetchedAt ? new Date(part.lastFetchedAt).getTime() : 0;
            if (now - lastFetchedAt < intervalMs) continue; // not due yet
        }
        await fetchAndPopulatePart(part, /* isResync */ true);
        anyPartFetched = true;
    }
    // In 'auto' (cron/background) mode specifically, skip the write entirely
    // when nothing was actually due - otherwise every tick rewrites this
    // source's KV output and bumps lastSync even when there was nothing to
    // do. A manual sync always regenerates regardless, since the person
    // explicitly asked for one (and may have edited configs without any
    // part having been re-fetched).
    if (isAuto && !anyPartFetched) return false;
    assignSequentialNames(source);
    await regenerateSourceOutput(source, settings, env);
    source.lastSync = new Date().toISOString();
    return true;
}

// Regenerates output for every source from whatever's already in memory/KV
// (applies current clean-IP lists, filters, etc.) WITHOUT re-fetching any
// subscription URL. Use this after something that only changes how output
// is built (e.g. editing a clean-IP list) - re-fetching upstream links in
// that case would be pointless network traffic and would also fight with
// a source's own auto-refresh interval, since it's not really a "refresh".
async function regenerateAllSourceOutputs(env) {
    const sources = await getSources(env);
    const settings = await getSettings(env);
    for (const source of sources) {
        await regenerateSourceOutput(source, settings, env);
    }
}

// Re-checks every URL part across every source and re-fetches whichever
// ones are actually due, per that part's own autoRefreshEnabled/interval
// (mode 'auto' - see syncSingleSourceLogic). This is genuine "go check
// upstream again" work; a part with automatic updates turned off is only
// ever refreshed by an explicit action (the manual "sync"/"sync all"
// button, which uses mode 'manual' and ignores the flag entirely).
async function processAllSubscriptions(env, options) {
    const mode = (options && options.mode) || 'manual';
    const sources = await getSources(env);
    const settings = await getSettings(env);
    let anyChanged = false;
    for (const source of sources) {
        const changed = await syncSingleSourceLogic(source, settings, env, mode);
        if (changed) anyChanged = true;
    }
    if (anyChanged) await saveSources(sources, env);
}

// ============================================================================
// HTTP HANDLERS: sources / parts / configs
// ============================================================================

async function handleGetState(env) {
    const settings = await getSettings(env);
    const sources = await getSources(env);

    const items = [];
    for (const src of sources) {
        let finalCount = 0;
        let updatedAt = null;
        let partWarnings = [];
        try {
            const outRaw = await env.SUB_DB.get(`out_${src.id}`);
            if (outRaw) {
                const out = JSON.parse(outRaw);
                finalCount = out.configs ? out.configs.split('\n').filter(Boolean).length : 0;
                updatedAt = out.updatedAt;
                partWarnings = out.partWarnings || [];
            }
        } catch (e) { /* skip corrupted output for this one source */ }

        const parts = src.parts || [];
        const categories = new Set(parts.map(p => p.category === 'independent' ? 'independent' : 'cloudflare'));
        const category = categories.size === 1 ? Array.from(categories)[0] : (categories.size > 1 ? 'mixed' : 'cloudflare');
        const baseCount = parts.reduce((sum, p) => sum + (p.baseConfigs || []).length, 0);
        const truncated = parts.some(p => p.truncated);

        items.push({
            id: src.id, slug: src.slug, name: src.name, category, partsCount: parts.length,
            lastSync: src.lastSync, updatedAt, baseCount, finalCount, truncated, partWarnings
        });
    }

    const cfConnections = (settings.cfConnections || []).map(c => ({
        id: c.id, label: c.label, accountId: c.accountId,
        tokenPreview: c.apiToken ? ('••••' + c.apiToken.slice(-4)) : ''
    }));

    const cleanIpLists = settings.cleanIpLists.map(l => ({ id: l.id, name: l.name, ips: l.ips, builtin: !!l.builtin }));

    return new Response(JSON.stringify({
        cleanIpLists, cfConnections, items, usingDefaultPassword: !env.ADMIN_PASSWORD
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function handleAddCleanIpList(request, env) {
    try {
        const data = await request.json();
        const name = (data.name || '').trim();
        const ips = Array.isArray(data.ips) ? data.ips.map(i => (i || '').trim()).filter(Boolean) : [];
        if (!name) return new Response(JSON.stringify({ success: false, error: 'LIST_NAME_REQUIRED' }), { status: 400 });
        if (ips.length === 0) return new Response(JSON.stringify({ success: false, error: 'LIST_NEEDS_ONE_IP' }), { status: 400 });
        if (ips.length > MAX_CLEAN_IPS_PER_LIST) return new Response(JSON.stringify({ success: false, error: 'LIST_MAX_IPS', errorParams: { limit: MAX_CLEAN_IPS_PER_LIST } }), { status: 400 });

        const settings = await getSettings(env);
        if (settings.cleanIpLists.length >= MAX_CLEAN_IP_LISTS) return new Response(JSON.stringify({ success: false, error: 'LIST_MAX_LISTS', errorParams: { limit: MAX_CLEAN_IP_LISTS } }), { status: 400 });

        settings.cleanIpLists.push({ id: shortId(), name, ips, builtin: false });
        await saveSettings(settings, env);
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'LIST_ADD_FAILED' }), { status: 500 });
    }
}

async function handleUpdateCleanIpList(listId, request, env, ctx) {
    try {
        const data = await request.json();
        const settings = await getSettings(env);
        const list = settings.cleanIpLists.find(l => l.id === listId);
        if (!list) return new Response(JSON.stringify({ success: false, error: 'LIST_NOT_FOUND' }), { status: 404 });

        if (typeof data.name === 'string' && data.name.trim()) list.name = data.name.trim();
        if (Array.isArray(data.ips)) {
            const ips = data.ips.map(i => (i || '').trim()).filter(Boolean);
            if (ips.length > MAX_CLEAN_IPS_PER_LIST) return new Response(JSON.stringify({ success: false, error: 'LIST_MAX_IPS', errorParams: { limit: MAX_CLEAN_IPS_PER_LIST } }), { status: 400 });
            list.ips = ips;
        }
        await saveSettings(settings, env);
        if (ctx && ctx.waitUntil) ctx.waitUntil(regenerateAllSourceOutputs(env));
        else await regenerateAllSourceOutputs(env);
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'LIST_UPDATE_FAILED' }), { status: 500 });
    }
}

async function handleDeleteCleanIpList(listId, env, ctx) {
    if (listId === BUILTIN_CLEAN_IP_LIST_ID) {
        return new Response(JSON.stringify({ success: false, error: 'LIST_DEFAULT_UNDELETABLE' }), { status: 400 });
    }
    try {
        const settings = await getSettings(env);
        settings.cleanIpLists = settings.cleanIpLists.filter(l => l.id !== listId);
        await saveSettings(settings, env);
        // Sources still pointing at the now-deleted list fall back to the
        // builtin list inside findCleanIpList - but their already-generated
        // /sub output won't reflect that until something regenerates it.
        if (ctx && ctx.waitUntil) ctx.waitUntil(regenerateAllSourceOutputs(env));
        else await regenerateAllSourceOutputs(env);
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'LIST_DELETE_FAILED' }), { status: 500 });
    }
}

async function handleAddSource(request, env) {
    try {
        const data = await request.json();
        const urls = Array.isArray(data.urls) ? data.urls.map(u => (u || '').trim()).filter(Boolean) : [];
        const manualText = (data.manual || '').trim();
        const manualLines = manualText ? manualText.split('\n').filter(l => l.trim()) : [];

        if (urls.length === 0 && !manualText) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NEEDS_URL_OR_MANUAL' }), { status: 400 });
        if (urls.length > MAX_URLS_PER_SOURCE) return new Response(JSON.stringify({ success: false, error: 'SOURCE_MAX_URLS', errorParams: { limit: MAX_URLS_PER_SOURCE } }), { status: 400 });
        if (manualLines.length > MAX_MANUAL_LINES_PER_ADD) return new Response(JSON.stringify({ success: false, error: 'SOURCE_MAX_MANUAL_LINES', errorParams: { limit: MAX_MANUAL_LINES_PER_ADD } }), { status: 400 });

        const sources = await getSources(env);
        const settings = await getSettings(env);
        // Category from the add-source form, used as each new part's default.
        const category = data.category === 'independent' ? 'independent' : 'cloudflare';

        const newSource = {
            id: shortId(),
            slug: makeUniqueSlug(sources),
            name: data.name || 'منبع جدید',
            createdAt: new Date().toISOString(),
            lastSync: null,
            parts: []
        };

        // Explicit useCleanIp from the request wins; otherwise fall back to category default.
        const explicitUseCleanIp = typeof data.useCleanIp === 'boolean' ? data.useCleanIp : null;

        for (const url of urls) {
            const part = makeNewPart('url', url, category);
            if (explicitUseCleanIp !== null) part.useCleanIp = explicitUseCleanIp;
            newSource.parts.push(part);
            await fetchAndPopulatePart(part, /* isResync */ false);
        }
        if (manualText) {
            const manualPart = makeNewPart('manual', null, category);
            if (explicitUseCleanIp !== null) manualPart.useCleanIp = explicitUseCleanIp;
            newSource.parts.push(manualPart);
            populatePartConfigs(manualPart, extractConfigsFromText(manualText));
        }

        assignSequentialNames(newSource);

        const totalConfigs = newSource.parts.reduce((sum, p) => sum + p.baseConfigs.length, 0);
        if (totalConfigs === 0) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NO_VALID_CONFIGS' }), { status: 400 });

        sources.push(newSource);
        await saveSources(sources, env);
        await env.SUB_DB.put(`slugidx_${newSource.slug}`, newSource.id);
        await regenerateSourceOutput(newSource, settings, env);
        return new Response(JSON.stringify({ success: true, id: newSource.id, slug: newSource.slug }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'SOURCE_ADD_FAILED' }), { status: 500 });
    }
}

async function handleDeleteSource(id, env) {
    try {
        let sources = await getSources(env);
        const source = sources.find(s => s.id === id);
        sources = sources.filter(s => s.id !== id);
        await saveSources(sources, env);
        await env.SUB_DB.delete(`out_${id}`);
        if (source && source.slug) await env.SUB_DB.delete(`slugidx_${source.slug}`);
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'SOURCE_DELETE_FAILED' }), { status: 500 });
    }
}

function isValidSlugFormat(slug) {
    return typeof slug === 'string' && slug.length >= SLUG_MIN_LENGTH && slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug);
}

// Lets the admin pick a memorable/custom public link instead of the random
// one assigned at creation (see makeUniqueSlug). The internal source id
// never changes - only the slug (and its KV index entry) move.
async function handleUpdateSourceSlug(sourceId, request, env) {
    try {
        const data = await request.json();
        const newSlug = typeof data.slug === 'string' ? data.slug.trim() : '';

        if (!isValidSlugFormat(newSlug)) {
            return new Response(JSON.stringify({ success: false, error: 'SLUG_INVALID_FORMAT', errorParams: { min: SLUG_MIN_LENGTH, max: SLUG_MAX_LENGTH } }), { status: 400 });
        }

        const sources = await getSources(env);
        const source = sources.find(s => s.id === sourceId);
        if (!source) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NOT_FOUND' }), { status: 404 });

        const oldSlug = source.slug;
        if (newSlug === oldSlug) return new Response(JSON.stringify({ success: true, slug: newSlug, unchanged: true }));

        // Reject if any OTHER source already uses this slug as its slug, or
        // as its raw id - handleServeSubscription falls back to treating
        // the token as a raw id when no slug index matches (see its
        // comment), so a collision with someone else's id would be just as
        // ambiguous as a collision with their slug.
        const taken = sources.some(s => s.id !== sourceId && (s.slug === newSlug || s.id === newSlug));
        if (taken) return new Response(JSON.stringify({ success: false, error: 'SLUG_TAKEN' }), { status: 409 });

        source.slug = newSlug;
        await saveSources(sources, env);
        if (oldSlug) await env.SUB_DB.delete(`slugidx_${oldSlug}`);
        await env.SUB_DB.put(`slugidx_${newSlug}`, sourceId);

        return new Response(JSON.stringify({ success: true, slug: newSlug }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'SLUG_UPDATE_FAILED' }), { status: 500 });
    }
}

async function handleUpdatePartSettings(sourceId, partId, request, env) {
    try {
        const data = await request.json();
        const sources = await getSources(env);
        const source = sources.find(s => s.id === sourceId);
        if (!source) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NOT_FOUND' }), { status: 404 });
        const part = (source.parts || []).find(p => p.id === partId);
        if (!part) return new Response(JSON.stringify({ success: false, error: 'PART_NOT_FOUND' }), { status: 404 });

        if (data.category === 'independent' || data.category === 'cloudflare') part.category = data.category;
        if (typeof data.useCleanIp === 'boolean') part.useCleanIp = data.useCleanIp;
        if (typeof data.oneConfigPerPort === 'boolean') part.oneConfigPerPort = data.oneConfigPerPort;
        if (typeof data.matchKnownRangesOnly === 'boolean') part.matchKnownRangesOnly = data.matchKnownRangesOnly;
        if (data.distribution === 'multiply' || data.distribution === 'random') part.distribution = data.distribution;
        if (typeof data.cleanIpListId === 'string' && data.cleanIpListId) part.cleanIpListId = data.cleanIpListId;
        if (Array.isArray(data.selectedPorts)) part.selectedPorts = data.selectedPorts.map(String).filter(Boolean);
        if (typeof data.uploadBoostEnabled === 'boolean') part.uploadBoostEnabled = data.uploadBoostEnabled;
        if (typeof data.uploadBoostFingerprint === 'string') part.uploadBoostFingerprint = data.uploadBoostFingerprint;
        if (typeof data.uploadBoostCipherSuites === 'string') part.uploadBoostCipherSuites = data.uploadBoostCipherSuites.trim();
        if (typeof data.uploadBoostFragmentMask === 'string') part.uploadBoostFragmentMask = data.uploadBoostFragmentMask.trim();
        // Auto-refresh only makes sense for a part that's actually fetched
        // from a URL - a manual part has nothing to refresh, so these two
        // fields are simply ignored for it.
        if (part.kind === 'url') {
            if (typeof data.autoRefreshEnabled === 'boolean') part.autoRefreshEnabled = data.autoRefreshEnabled;
            if (data.autoRefreshMinutes !== undefined) part.autoRefreshMinutes = clampAutoRefreshMinutes(data.autoRefreshMinutes);
        }

        await saveSources(sources, env);
        const settings = await getSettings(env);
        await regenerateSourceOutput(source, settings, env);
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'PART_UPDATE_FAILED' }), { status: 500 });
    }
}

// Removes one part from a source entirely (unlike handleDeleteConfigFromPart,
// which removes a single config from within a part). The source itself, its
// id, and its slug are untouched - only this one part and its configs are
// gone. Numbers are recomputed the same way as any other structural change.
async function handleDeletePartFromSource(sourceId, partId, env) {
    try {
        const sources = await getSources(env);
        const source = sources.find(s => s.id === sourceId);
        if (!source) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NOT_FOUND' }), { status: 404 });
        const idx = (source.parts || []).findIndex(p => p.id === partId);
        if (idx === -1) return new Response(JSON.stringify({ success: false, error: 'PART_NOT_FOUND' }), { status: 404 });

        source.parts.splice(idx, 1);
        assignSequentialNames(source);

        await saveSources(sources, env);
        const settings = await getSettings(env);
        await regenerateSourceOutput(source, settings, env);
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'PART_DELETE_FAILED' }), { status: 500 });
    }
}

async function handleSyncOneSource(sourceId, env) {
    try {
        const sources = await getSources(env);
        const source = sources.find(s => s.id === sourceId);
        if (!source) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NOT_FOUND' }), { status: 404 });
        const settings = await getSettings(env);
        await syncSingleSourceLogic(source, settings, env);
        await saveSources(sources, env);
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'SYNC_FAILED' }), { status: 500 });
    }
}

async function handleGetSourceConfigs(sourceId, env) {
    const sources = await getSources(env);
    const source = sources.find(s => s.id === sourceId);
    if (!source) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NOT_FOUND' }), { status: 404 });
    const settings = await getSettings(env);

    const parts = (source.parts || []).map(part => {
        const list = (part.baseConfigs || []).map(c => ({
            configId: c.configId, name: c.name, customName: c.customName || null, protocol: c.protocol, isTls: c.isTls,
            host: safeHostPreview(c), port: extractConfigPort(c), blocked: isConfigBlocked(part, c)
        }));
        const availablePorts = Array.from(new Set(list.map(c => c.port))).sort((a, b) => Number(a) - Number(b) || (a < b ? -1 : 1));
        return {
            id: part.id, kind: part.kind, url: part.url,
            category: part.category === 'independent' ? 'independent' : 'cloudflare',
            useCleanIp: part.useCleanIp !== false,
            cleanIpListId: part.cleanIpListId || BUILTIN_CLEAN_IP_LIST_ID,
            distribution: part.distribution === 'random' ? 'random' : 'multiply',
            oneConfigPerPort: !!part.oneConfigPerPort,
            matchKnownRangesOnly: part.matchKnownRangesOnly !== false,
            autoRefreshEnabled: part.kind === 'url' ? part.autoRefreshEnabled !== false : null,
            autoRefreshMinutes: part.kind === 'url' ? clampAutoRefreshMinutes(part.autoRefreshMinutes) : null,
            uploadBoostEnabled: !!part.uploadBoostEnabled,
            uploadBoostFingerprint: part.uploadBoostFingerprint || DEFAULT_UPLOAD_BOOST_FINGERPRINT,
            uploadBoostCipherSuites: part.uploadBoostCipherSuites || DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
            uploadBoostFragmentMask: part.uploadBoostFragmentMask || DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
            truncated: !!part.truncated, lastFetchOk: part.lastFetchOk,
            availablePorts, selectedPorts: part.selectedPorts || [], configs: list
        };
    });

    return new Response(JSON.stringify({
        parts, cleanIpLists: settings.cleanIpLists.map(l => ({ id: l.id, name: l.name, ips: l.ips, builtin: !!l.builtin }))
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function handleAddConfigToPart(sourceId, partId, request, env) {
    try {
        const data = await request.json();
        const raw = (data.raw || '').trim();
        if (!raw) return new Response(JSON.stringify({ success: false, error: 'CONFIG_EMPTY' }), { status: 400 });

        const sources = await getSources(env);
        const source = sources.find(s => s.id === sourceId);
        if (!source) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NOT_FOUND' }), { status: 404 });
        source.parts = source.parts || [];

        let part = source.parts.find(p => p.id === partId);
        if (!part && partId === 'manual-new') {
            part = makeNewPart('manual', null, 'cloudflare');
            source.parts.push(part);
        }
        if (!part) return new Response(JSON.stringify({ success: false, error: 'PART_NOT_FOUND' }), { status: 404 });

        const parsed = parseOneConfigLine(raw);
        if (!parsed) return new Response(JSON.stringify({ success: false, error: 'CONFIG_INVALID_FORMAT' }), { status: 400 });

        part.baseConfigs = part.baseConfigs || [];
        if (part.baseConfigs.length >= MAX_BASE_CONFIGS_PER_PART) return new Response(JSON.stringify({ success: false, error: 'PART_MAX_CONFIGS', errorParams: { limit: MAX_BASE_CONFIGS_PER_PART } }), { status: 400 });
        if (part.baseConfigs.some(c => c.fingerprint === parsed.fingerprint)) return new Response(JSON.stringify({ success: false, error: 'CONFIG_DUPLICATE' }), { status: 409 });

        parsed.configId = shortId();
        part.baseConfigs.push(parsed);
        assignSequentialNames(source);

        await saveSources(sources, env);
        const settings = await getSettings(env);
        await regenerateSourceOutput(source, settings, env);
        return new Response(JSON.stringify({ success: true, partId: part.id }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'CONFIG_ADD_FAILED' }), { status: 500 });
    }
}

// True forget: the config is removed with no trace. If it's a URL part and
// the same config reappears on a future sync, it's parsed as brand new by
// populatePartConfigs (there's no persistent identity to reattach to) - see
// resyncPart. Use handleToggleBlockConfig instead if you want it excluded
// from output but still shown (with a visible gap where its number was).
async function handleDeleteConfigFromPart(sourceId, partId, configId, env) {
    try {
        const sources = await getSources(env);
        const source = sources.find(s => s.id === sourceId);
        if (!source) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NOT_FOUND' }), { status: 404 });
        const part = (source.parts || []).find(p => p.id === partId);
        if (!part) return new Response(JSON.stringify({ success: false, error: 'PART_NOT_FOUND' }), { status: 404 });

        const list = part.baseConfigs || [];
        const idx = list.findIndex(c => c.configId === configId);
        if (idx === -1) return new Response(JSON.stringify({ success: false, error: 'CONFIG_NOT_FOUND' }), { status: 404 });

        // A manual delete is a deliberate "forget this one" action - unlike a
        // resync (where a config can vanish and reappear, so its blocked/
        // custom-name state deliberately survives via fingerprint), so we
        // also purge its fingerprint from both maps here. Otherwise a config
        // with the same fingerprint reappearing later (e.g. the same config
        // shows up again in a future fetch) would silently come back blocked
        // or renamed, which the person has no way to see coming.
        const deletedFingerprint = list[idx].fingerprint;
        list.splice(idx, 1);
        part.blockedFingerprints = (part.blockedFingerprints || []).filter(f => f !== deletedFingerprint);
        if (part.customNamesByFingerprint) delete part.customNamesByFingerprint[deletedFingerprint];
        assignSequentialNames(source);

        await saveSources(sources, env);
        const settings = await getSettings(env);
        await regenerateSourceOutput(source, settings, env);
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'CONFIG_DELETE_FAILED' }), { status: 500 });
    }
}

// Toggles a config between blocked (excluded from output, but permanently
// remembered - and still numbered, so the gap in the output is meaningful -
// via part.blockedFingerprints, see resyncPart) and active again. Blocking
// never touches ordering, so numbers don't need reassigning here.
async function handleToggleBlockConfig(sourceId, partId, configId, env) {
    try {
        const sources = await getSources(env);
        const source = sources.find(s => s.id === sourceId);
        if (!source) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NOT_FOUND' }), { status: 404 });
        const part = (source.parts || []).find(p => p.id === partId);
        if (!part) return new Response(JSON.stringify({ success: false, error: 'PART_NOT_FOUND' }), { status: 404 });

        const cfg = (part.baseConfigs || []).find(c => c.configId === configId);
        if (!cfg) return new Response(JSON.stringify({ success: false, error: 'CONFIG_NOT_FOUND' }), { status: 404 });

        part.blockedFingerprints = part.blockedFingerprints || [];
        const wasBlocked = part.blockedFingerprints.includes(cfg.fingerprint);

        if (!wasBlocked) {
            if (part.blockedFingerprints.length >= MAX_BLOCKED_PER_PART) {
                return new Response(JSON.stringify({ success: false, error: 'PART_MAX_BLOCKED', errorParams: { limit: MAX_BLOCKED_PER_PART } }), { status: 400 });
            }
            part.blockedFingerprints.push(cfg.fingerprint);
        } else {
            part.blockedFingerprints = part.blockedFingerprints.filter(fp => fp !== cfg.fingerprint);
        }

        await saveSources(sources, env);
        const settings = await getSettings(env);
        await regenerateSourceOutput(source, settings, env);
        return new Response(JSON.stringify({ success: true, blocked: !wasBlocked }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'CONFIG_TOGGLE_FAILED' }), { status: 500 });
    }
}

// Bulk version of the toggle above, for the "select all / deselect all"
// checkbox above a part's config list. selected=true clears
// blockedFingerprints entirely (every config back in the output);
// selected=false blocks every config in the part, up to MAX_BLOCKED_PER_PART
// - if the part has more configs than that cap allows, as many as fit are
// blocked and the response says so, rather than silently doing something
// different from what the checkbox implied.
async function handleBulkSetConfigsIncluded(sourceId, partId, request, env) {
    try {
        const data = await request.json();
        const selected = data.selected !== false;

        const sources = await getSources(env);
        const source = sources.find(s => s.id === sourceId);
        if (!source) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NOT_FOUND' }), { status: 404 });
        const part = (source.parts || []).find(p => p.id === partId);
        if (!part) return new Response(JSON.stringify({ success: false, error: 'PART_NOT_FOUND' }), { status: 404 });

        const totalCount = (part.baseConfigs || []).length;
        let blockedCount = 0;
        let capped = false;

        if (selected) {
            part.blockedFingerprints = [];
        } else {
            const allFingerprints = (part.baseConfigs || []).map(c => c.fingerprint);
            capped = allFingerprints.length > MAX_BLOCKED_PER_PART;
            part.blockedFingerprints = allFingerprints.slice(0, MAX_BLOCKED_PER_PART);
            blockedCount = part.blockedFingerprints.length;
        }

        await saveSources(sources, env);
        const settings = await getSettings(env);
        await regenerateSourceOutput(source, settings, env);
        return new Response(JSON.stringify({ success: true, selected, blockedCount, totalCount, capped }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'CONFIG_BULK_TOGGLE_FAILED' }), { status: 500 });
    }
}

// Sets (or clears, if name is blank) a one-off display name override for a
// single config. This is purely cosmetic - it doesn't touch the config's
// position or its auto-assigned sequential name (see assignSequentialNames)
// - and it's intentionally NOT durable: the next resync rebuilds this
// part's configs from scratch (see populatePartConfigs), so the override
// naturally disappears and the auto name takes over again. That's by
// design, not a bug - a custom name describes "how this config's remark
// looks right now", not a permanent identity for it.
const MAX_CUSTOM_NAME_LENGTH = 60;

async function handleSetConfigCustomName(sourceId, partId, configId, request, env) {
    try {
        const data = await request.json();
        const name = typeof data.name === 'string' ? data.name.trim().slice(0, MAX_CUSTOM_NAME_LENGTH) : '';

        const sources = await getSources(env);
        const source = sources.find(s => s.id === sourceId);
        if (!source) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NOT_FOUND' }), { status: 404 });
        const part = (source.parts || []).find(p => p.id === partId);
        if (!part) return new Response(JSON.stringify({ success: false, error: 'PART_NOT_FOUND' }), { status: 404 });
        const cfg = (part.baseConfigs || []).find(c => c.configId === configId);
        if (!cfg) return new Response(JSON.stringify({ success: false, error: 'CONFIG_NOT_FOUND' }), { status: 404 });

        part.customNamesByFingerprint = part.customNamesByFingerprint || {};
        if (name) {
            cfg.customName = name;
            // Cap the fingerprint map the same way blockedFingerprints is
            // capped - only actually enforced when adding a genuinely new
            // key, so renaming an already-named config never trips it.
            if (!(cfg.fingerprint in part.customNamesByFingerprint) && Object.keys(part.customNamesByFingerprint).length >= MAX_CUSTOM_NAMES_PER_PART) {
                return new Response(JSON.stringify({ success: false, error: 'PART_MAX_CUSTOM_NAMES', errorParams: { limit: MAX_CUSTOM_NAMES_PER_PART } }), { status: 400 });
            }
            part.customNamesByFingerprint[cfg.fingerprint] = name;
        } else {
            delete cfg.customName;
            delete part.customNamesByFingerprint[cfg.fingerprint];
        }

        await saveSources(sources, env);
        const settings = await getSettings(env);
        await regenerateSourceOutput(source, settings, env);
        return new Response(JSON.stringify({ success: true, customName: cfg.customName || null }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'CONFIG_RENAME_FAILED' }), { status: 500 });
    }
}

// Applies a whole part's config-list edits (deletions, reordering, and
// include/exclude state) in one write. Used by the panel's "save this
// part's settings" button, which stages all of those actions locally and
// only sends them here once, instead of one request per click - see the
// dashboard script's pendingDeletes/pendingIncluded/pendingOrder. Renames
// are handled separately (flushPendingNameEditsForPart / the /name
// endpoint) since they were already staged that way before this endpoint
// existed.
async function handleBatchUpdatePartConfigs(sourceId, partId, request, env) {
    try {
        const data = await request.json();
        const order = Array.isArray(data.order) ? data.order.filter(id => typeof id === 'string') : null;
        const deletedConfigIds = new Set(Array.isArray(data.deletedConfigIds) ? data.deletedConfigIds.filter(id => typeof id === 'string') : []);
        const blockedConfigIds = new Set(Array.isArray(data.blockedConfigIds) ? data.blockedConfigIds.filter(id => typeof id === 'string') : []);

        const sources = await getSources(env);
        const source = sources.find(s => s.id === sourceId);
        if (!source) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NOT_FOUND' }), { status: 404 });
        const part = (source.parts || []).find(p => p.id === partId);
        if (!part) return new Response(JSON.stringify({ success: false, error: 'PART_NOT_FOUND' }), { status: 404 });

        part.baseConfigs = part.baseConfigs || [];
        part.blockedFingerprints = part.blockedFingerprints || [];
        part.customNamesByFingerprint = part.customNamesByFingerprint || {};

        if (deletedConfigIds.size > 0) {
            const survivors = [];
            for (const cfg of part.baseConfigs) {
                if (!deletedConfigIds.has(cfg.configId)) { survivors.push(cfg); continue; }
                // Same "true forget" semantics as handleDeleteConfigFromPart:
                // purge the fingerprint so a config reappearing later on
                // resync doesn't silently come back blocked/renamed.
                part.blockedFingerprints = part.blockedFingerprints.filter(f => f !== cfg.fingerprint);
                delete part.customNamesByFingerprint[cfg.fingerprint];
            }
            part.baseConfigs = survivors;
        }

        if (order) {
            const byId = new Map(part.baseConfigs.map(c => [c.configId, c]));
            const reordered = [];
            order.forEach(id => { if (byId.has(id)) { reordered.push(byId.get(id)); byId.delete(id); } });
            byId.forEach(c => reordered.push(c));
            part.baseConfigs = reordered;
        }

        let capped = false;
        const newBlockedFingerprints = [];
        part.baseConfigs.forEach(cfg => {
            if (!blockedConfigIds.has(cfg.configId)) return;
            if (newBlockedFingerprints.length >= MAX_BLOCKED_PER_PART) { capped = true; return; }
            newBlockedFingerprints.push(cfg.fingerprint);
        });
        part.blockedFingerprints = newBlockedFingerprints;

        assignSequentialNames(source);

        await saveSources(sources, env);
        const settings = await getSettings(env);
        await regenerateSourceOutput(source, settings, env);
        return new Response(JSON.stringify({ success: true, capped }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'CONFIG_BATCH_UPDATE_FAILED' }), { status: 500 });
    }
}

async function handleReorderPartConfigs(sourceId, partId, request, env) {
    try {
        const data = await request.json();
        const order = Array.isArray(data.order) ? data.order : [];

        const sources = await getSources(env);
        const source = sources.find(s => s.id === sourceId);
        if (!source) return new Response(JSON.stringify({ success: false, error: 'SOURCE_NOT_FOUND' }), { status: 404 });
        const part = (source.parts || []).find(p => p.id === partId);
        if (!part) return new Response(JSON.stringify({ success: false, error: 'PART_NOT_FOUND' }), { status: 404 });

        const current = part.baseConfigs || [];
        const byId = new Map(current.map(c => [c.configId, c]));
        const reordered = [];
        order.forEach(id => { if (byId.has(id)) { reordered.push(byId.get(id)); byId.delete(id); } });
        byId.forEach(c => reordered.push(c));
        part.baseConfigs = reordered;
        assignSequentialNames(source);

        await saveSources(sources, env);
        const settings = await getSettings(env);
        await regenerateSourceOutput(source, settings, env);
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'CONFIG_REORDER_FAILED' }), { status: 500 });
    }
}

// ============================================================================
// CLOUDFLARE API CONNECTIONS (optional usage-stats monitoring)
// ============================================================================

async function validateCfConnection(accountId, apiToken) {
    if (!accountId || !apiToken) return { ok: false, error: 'CF_CREDENTIALS_REQUIRED' };
    try {
        const verifyResp = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", { headers: { "Authorization": `Bearer ${apiToken}` } });
        const verifyJson = await verifyResp.json().catch(() => null);
        if (!verifyResp.ok || !verifyJson || verifyJson.success !== true) return { ok: false, error: 'CF_TOKEN_INVALID' };

        const acctResp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}`, { headers: { "Authorization": `Bearer ${apiToken}` } });
        const acctJson = await acctResp.json().catch(() => null);
        if (!acctResp.ok || !acctJson || acctJson.success !== true) return { ok: false, error: 'CF_ACCOUNT_MISMATCH' };
        return { ok: true };
    } catch (e) {
        return { ok: false, error: 'CF_VALIDATION_FAILED' };
    }
}

async function handleAddCfConnection(request, env) {
    try {
        const data = await request.json();
        const label = (data.label || '').trim() || 'اکانت کلودفلر';
        const accountId = (data.accountId || '').trim();
        const apiToken = (data.apiToken || '').trim();

        const validation = await validateCfConnection(accountId, apiToken);
        if (!validation.ok) return new Response(JSON.stringify({ success: false, error: validation.error }), { status: 400 });

        const settings = await getSettings(env);
        settings.cfConnections.push({ id: shortId(), label, accountId, apiToken });
        await saveSettings(settings, env);
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'CF_CONNECTION_ADD_FAILED' }), { status: 500 });
    }
}

async function handleDeleteCfConnection(connectionId, env) {
    try {
        const settings = await getSettings(env);
        settings.cfConnections = settings.cfConnections.filter(c => c.id !== connectionId);
        await saveSettings(settings, env);
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'CF_CONNECTION_DELETE_FAILED' }), { status: 500 });
    }
}

async function handleGetCloudflareStats(connectionId, env) {
    const settings = await getSettings(env);
    const conn = settings.cfConnections.find(c => c.id === connectionId);
    if (!conn) return new Response(JSON.stringify({ error: "این اتصال API یافت نشد." }), { status: 404 });

    // Cloudflare account IDs are always a 32-char lowercase hex string.
    // Anything else must never reach the GraphQL query string below - this
    // is a defense-in-depth check on a value we already normally control
    // (validateCfConnection checks this at save time), not the primary gate.
    if (!/^[a-f0-9]{32}$/i.test(conn.accountId || '')) {
        return new Response(JSON.stringify({ error: "Account ID این اتصال نامعتبر است." }), { status: 400 });
    }

    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const query = `query { viewer { accounts(filter: {accountTag: "${conn.accountId}"}) { workersInvocationsAdaptive(limit: 1, filter: {datetime_geq: "${startOfDay.toISOString()}", datetime_lt: "${endOfDay.toISOString()}"}) { sum { requests } } } } }`;

    try {
        const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${conn.apiToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const json = await resp.json().catch(() => null);
        if (!resp.ok || !json || json.errors) {
            const message = (json && json.errors && json.errors[0] && json.errors[0].message) || "دریافت آمار از کلودفلر ناموفق بود";
            return new Response(JSON.stringify({ error: message }), { status: 502 });
        }
        const accounts = json.data && json.data.viewer && json.data.viewer.accounts;
        if (!accounts || accounts.length === 0) return new Response(JSON.stringify({ error: "این توکن به اطلاعات آماری این اکانت دسترسی ندارد." }), { status: 403 });
        const stats = (accounts[0].workersInvocationsAdaptive && accounts[0].workersInvocationsAdaptive[0] && accounts[0].workersInvocationsAdaptive[0].sum) || { requests: 0 };
        return new Response(JSON.stringify({ requests: stats.requests, label: conn.label }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: "اتصال به کلودفلر برقرار نشد." }), { status: 500 });
    }
}

// ============================================================================
// PUBLIC SUBSCRIPTION ENDPOINT
// ============================================================================

// /sub/{token}: token is normally a source's slug (see makeUniqueSlug /
// handleUpdateSourceSlug), resolved through the slug index. The ONLY
// fallback beyond that index is for a source that predates the slug field
// entirely: normalizeSourceShape backfills such a source's slug to equal
// its own id, but a plain read (getSources) never writes the missing
// index entry. We detect exactly that case - and only that case - by
// requiring the source's CURRENT slug to still equal the id being looked
// up. This is deliberately NOT "treat any unmatched token as a raw source
// id": a source's internal id must never work as a permanent, unrevokable
// second public link once its slug has been customized (or was assigned
// as a random slug at creation, which never equals the id in the first
// place) - see handleUpdateSourceSlug, which revokes the old slug's index
// entry on rename but previously had no way to also revoke the id itself
// acting as an implicit alias. Once found, the index entry is written so
// this fallback is only ever needed once per legacy source.
async function resolveSourceIdFromToken(token, env) {
    const indexed = await env.SUB_DB.get(`slugidx_${token}`);
    if (indexed) return indexed;
    const sources = await getSources(env);
    const legacyMatch = sources.find(s => s.id === token && s.slug === token);
    if (!legacyMatch) return null;
    try { await env.SUB_DB.put(`slugidx_${token}`, token); } catch (e) { /* self-heal is best-effort */ }
    return token;
}

async function handleServeSubscription(token, env, ctx) {
    if (!token) return new Response("Subscription Not Found", { status: 404 });
    const id = await resolveSourceIdFromToken(token, env);
    if (!id) return new Response("Subscription Not Found", { status: 404 });
    const dataStr = await env.SUB_DB.get(`out_${id}`);
    if (!dataStr) return new Response("Subscription Not Found", { status: 404 });

    try {
        const data = JSON.parse(dataStr);
        // Stale-while-revalidate: the client always gets whatever we have
        // right now, instantly. nextAutoRefreshDueAt (see
        // computeNextAutoRefreshDueAt) is pre-computed across every url
        // part's own auto-refresh setting, and is null when nothing in this
        // source is due for automatic refreshing (e.g. it's fully manual,
        // or every url part has auto-refresh turned off) - in that case we
        // never kick off a background fetch here at all.
        if (data.nextAutoRefreshDueAt && Date.now() > new Date(data.nextAutoRefreshDueAt).getTime()) {
            ctx.waitUntil(backgroundRefreshOneSource(id, env));
        }
        const base64Configs = btoa(unescape(encodeURIComponent(data.configs || "")));
        // Tells v2rayN/v2rayNG/NekoBox/etc how often THEY should re-fetch this
        // link on their own schedule - the shortest interval among this
        // source's enabled url parts (see computeSourceUpdateIntervalMinutes).
        // Minimum 1 hour (clients round to whole hours; 0 would mean "never"
        // to some of them).
        const updateIntervalHours = Math.max(1, Math.round((data.updateIntervalMinutes || DEFAULT_AUTO_REFRESH_MINUTES) / 60));
        return new Response(base64Configs, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Profile-Title": "base64:" + btoa(unescape(encodeURIComponent(data.name || "AutoSub"))),
                "Profile-Update-Interval": String(updateIntervalHours),
                // Always let the client's own Profile-Update-Interval logic
                // decide when to re-fetch, not an intermediary cache - a
                // cached response here could serve a stale subscription (or
                // someone else's, on a misconfigured shared cache) well past
                // when it should have refreshed.
                "Cache-Control": "no-store"
            }
        });
    } catch (e) {
        return new Response("Subscription data corrupted", { status: 500 });
    }
}

// Called from handleServeSubscription's stale-while-revalidate path - this
// IS the automatic path, so it must only touch parts that are actually due
// and haven't been turned off (mode 'auto').
async function backgroundRefreshOneSource(id, env) {
    try {
        const sources = await getSources(env);
        const source = sources.find(s => s.id === id);
        if (!source) return;
        const settings = await getSettings(env);
        const changed = await syncSingleSourceLogic(source, settings, env, 'auto');
        if (changed) await saveSources(sources, env);
    } catch (e) {
        // silently ignored - previous cached output stays as-is
    }
}

// ============================================================================
// LOGIN RATE-LIMITING
// ============================================================================

async function checkLoginCooldown(env, ip) {
    try {
        const raw = await env.SUB_DB.get(`login_fail_${ip}`);
        if (!raw) return { blocked: false };
        const data = JSON.parse(raw);
        const fails = data.fails || 0;
        const lastFail = data.lastFail || 0;
        const cooldown = Math.min(fails * LOGIN_COOLDOWN_STEP_SECONDS, LOGIN_COOLDOWN_CAP_SECONDS);
        const elapsedSeconds = (Date.now() - lastFail) / 1000;
        if (elapsedSeconds < cooldown) {
            return { blocked: true, retryAfterSeconds: Math.ceil(cooldown - elapsedSeconds) };
        }
        return { blocked: false };
    } catch (e) {
        return { blocked: false };
    }
}

async function recordFailedLogin(env, ip) {
    try {
        const raw = await env.SUB_DB.get(`login_fail_${ip}`);
        const fails = (raw ? (JSON.parse(raw).fails || 0) : 0) + 1;
        await env.SUB_DB.put(`login_fail_${ip}`, JSON.stringify({ fails, lastFail: Date.now() }), { expirationTtl: LOGIN_FAIL_RECORD_TTL_SECONDS });
    } catch (e) { /* rate-limiting unavailable, login still works */ }
}

async function clearFailedLogin(env, ip) {
    try { await env.SUB_DB.delete(`login_fail_${ip}`); } catch (e) { /* not critical */ }
}

// ============================================================================
// API ROUTING
// ============================================================================

async function handleApi(parts, request, env, ctx) {
    const method = request.method;

    if (parts.length === 2 && parts[1] === 'state' && method === 'GET') return await handleGetState(env);

    if (parts.length === 2 && parts[1] === 'clean-ip-lists' && method === 'POST') return await handleAddCleanIpList(request, env);
    if (parts.length === 3 && parts[1] === 'clean-ip-lists' && method === 'PUT') return await handleUpdateCleanIpList(parts[2], request, env, ctx);
    if (parts.length === 3 && parts[1] === 'clean-ip-lists' && method === 'DELETE') return await handleDeleteCleanIpList(parts[2], env, ctx);

    if (parts.length === 2 && parts[1] === 'sources' && method === 'POST') return await handleAddSource(request, env);
    if (parts.length === 3 && parts[1] === 'sources' && method === 'DELETE') return await handleDeleteSource(parts[2], env);
    if (parts.length === 4 && parts[1] === 'sources' && parts[3] === 'slug' && method === 'PUT') return await handleUpdateSourceSlug(parts[2], request, env);
    if (parts.length === 4 && parts[1] === 'sources' && parts[3] === 'sync' && method === 'POST') return await handleSyncOneSource(parts[2], env);
    if (parts.length === 4 && parts[1] === 'sources' && parts[3] === 'configs' && method === 'GET') return await handleGetSourceConfigs(parts[2], env);
    if (parts.length === 5 && parts[1] === 'sources' && parts[3] === 'parts' && method === 'PUT') return await handleUpdatePartSettings(parts[2], parts[4], request, env);
    if (parts.length === 5 && parts[1] === 'sources' && parts[3] === 'parts' && method === 'DELETE') return await handleDeletePartFromSource(parts[2], parts[4], env);
    if (parts.length === 6 && parts[1] === 'sources' && parts[3] === 'parts' && parts[5] === 'configs' && method === 'POST') return await handleAddConfigToPart(parts[2], parts[4], request, env);
    if (parts.length === 7 && parts[1] === 'sources' && parts[3] === 'parts' && parts[5] === 'configs' && parts[6] === 'order' && method === 'PUT') return await handleReorderPartConfigs(parts[2], parts[4], request, env);
    if (parts.length === 7 && parts[1] === 'sources' && parts[3] === 'parts' && parts[5] === 'configs' && parts[6] === 'batch' && method === 'PUT') return await handleBatchUpdatePartConfigs(parts[2], parts[4], request, env);
    if (parts.length === 8 && parts[1] === 'sources' && parts[3] === 'parts' && parts[5] === 'configs' && parts[7] === 'block' && method === 'PUT') return await handleToggleBlockConfig(parts[2], parts[4], parts[6], env);
    if (parts.length === 7 && parts[1] === 'sources' && parts[3] === 'parts' && parts[5] === 'configs' && parts[6] === 'select-all' && method === 'PUT') return await handleBulkSetConfigsIncluded(parts[2], parts[4], request, env);
    if (parts.length === 8 && parts[1] === 'sources' && parts[3] === 'parts' && parts[5] === 'configs' && parts[7] === 'name' && method === 'PUT') return await handleSetConfigCustomName(parts[2], parts[4], parts[6], request, env);
    if (parts.length === 7 && parts[1] === 'sources' && parts[3] === 'parts' && parts[5] === 'configs' && method === 'DELETE') return await handleDeleteConfigFromPart(parts[2], parts[4], parts[6], env);

    if (parts.length === 2 && parts[1] === 'sync' && method === 'POST') {
        await processAllSubscriptions(env);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    if (parts.length === 2 && parts[1] === 'cf-connections' && method === 'POST') return await handleAddCfConnection(request, env);
    if (parts.length === 3 && parts[1] === 'cf-connections' && method === 'DELETE') return await handleDeleteCfConnection(parts[2], env);
    if (parts.length === 4 && parts[1] === 'cf-connections' && parts[3] === 'stats' && method === 'GET') return await handleGetCloudflareStats(parts[2], env);

    if (parts.length === 2 && parts[1] === 'backup' && method === 'GET') return await handleExportBackup(env, request);
    if (parts.length === 2 && parts[1] === 'backup' && method === 'POST') return await handleImportBackup(request, env, ctx);

    return new Response("Not Found", { status: 404 });
}

// ============================================================================
// MAIN ROUTING
// ============================================================================

export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            const path = url.pathname;

            if (!env.SUB_DB) return new Response("Error: KV Database (SUB_DB) is not bound to this Worker.", { status: 500 });

            const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "admin123";

            if (path.startsWith('/sub/')) {
                const token = path.split('/')[2];
                return await handleServeSubscription(token, env, ctx);
            }

            const cookies = parseCookies(request.headers.get("Cookie") || "");
            const isAuth = await isValidSession(cookies.session, env);

            if (path === PANEL_PATH + '/login' && request.method === 'POST') {
                const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
                const cooldown = await checkLoginCooldown(env, clientIp);
                if (cooldown.blocked) return renderHTML(getLoginHTML(false, `Please try again in ${cooldown.retryAfterSeconds} seconds.`), 429);

                let password = "";
                try {
                    const formData = await request.formData();
                    password = formData.get('password') || "";
                } catch (e) {
                    return renderHTML(getLoginHTML(true), 401);
                }

                if (password === ADMIN_PASSWORD) {
                    await clearFailedLogin(env, clientIp);
                    const token = await createSession(env);
                    return new Response(null, {
                        status: 302,
                        headers: { "Location": PANEL_PATH, "Set-Cookie": `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}` }
                    });
                }
                await recordFailedLogin(env, clientIp);
                return renderHTML(getLoginHTML(true), 401);
            }

            if (path === PANEL_PATH + '/logout') {
                ctx.waitUntil(destroySession(cookies.session, env));
                return new Response(null, { status: 302, headers: { "Location": PANEL_PATH, "Set-Cookie": `session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` } });
            }

            if (path === PANEL_PATH || path === PANEL_PATH + '/') {
                if (!isAuth) return renderHTML(getLoginHTML(false));
                return renderHTML(getDashboardHTML(url.origin));
            }

            if (path.startsWith('/api/')) {
                if (!isAuth) {
                    return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
                    });
                }
                const parts = path.split('/').filter(Boolean);
                const apiResponse = await handleApi(parts, request, env, ctx);
                // Every /api/ response carries account data or state-changing
                // results - never appropriate for a browser or intermediary
                // cache to store or reuse, added once here rather than at
                // every individual handler's `new Response(...)` call site.
                if (!apiResponse.headers.has('Cache-Control')) {
                    const headers = new Headers(apiResponse.headers);
                    headers.set('Cache-Control', 'no-store');
                    return new Response(apiResponse.body, { status: apiResponse.status, statusText: apiResponse.statusText, headers });
                }
                return apiResponse;
            }

            return new Response("Not Found", { status: 404 });
        } catch (err) {
            // Generic on purpose - never leak err.message (stack traces, file
            // paths, internal identifiers) to whatever sent the request.
            return new Response("Internal Server Error", { status: 500 });
        }
    },

    // Optional Cron Trigger entry point. This worker does NOT require a
    // Cron Trigger to keep subscriptions fresh - see handleServeSubscription,
    // which already self-refreshes on demand (stale-while-revalidate) the
    // moment a client requests /sub/{slug} and finds the cached output older
    // than that part's own interval. Adding a Cron Trigger in the Cloudflare
    // dashboard (Settings -> Triggers -> Cron Triggers) is a pure bonus: it
    // means subscriptions get refreshed proactively even if nobody happens
    // to open a client for a while, so the first request after a quiet
    // period doesn't have to wait on a background refresh. Either way,
    // 'auto' mode here only touches parts that are due AND have
    // autoRefreshEnabled !== false - a part with automatic updates turned
    // off is only ever refreshed by an explicit manual sync.
    async scheduled(event, env, ctx) {
        ctx.waitUntil(processAllSubscriptions(env, { mode: 'auto' }));
    }
};

function renderHTML(html, status) {
    return new Response(html, {
        status: status || 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            // The panel is the only thing that should ever render inside
            // itself, and it doesn't load third-party embeds - these cost
            // nothing to set and remove a couple of easy attack classes
            // (clickjacking, MIME-sniffing) for free.
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer'
        }
    });
}

// ============================================================================
// HTML: login page
// ============================================================================

function getLoginHTML(showError, customMessage) {
    return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4KPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzgxOGNmOCIvPgo8c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iI2MwODRmYyIvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM3ZGQzZmMiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8cmVjdCB4PSIxIiB5PSIxIiB3aWR0aD0iMjIiIGhlaWdodD0iMjIiIHJ4PSI2IiBmaWxsPSIjMGIwZjFhIi8+CjxyZWN0IHg9IjQuMiIgeT0iNS4zIiB3aWR0aD0iMTMuNSIgaGVpZ2h0PSIzLjYiIHJ4PSIxLjgiIGZpbGw9InVybCgjZykiLz4KPHJlY3QgeD0iNC4yIiB5PSIxMC4yIiB3aWR0aD0iMTUuNiIgaGVpZ2h0PSIzLjYiIHJ4PSIxLjgiIGZpbGw9InVybCgjZykiIG9wYWNpdHk9IjAuNzIiLz4KPHJlY3QgeD0iNC4yIiB5PSIxNS4xIiB3aWR0aD0iMTAuNCIgaGVpZ2h0PSIzLjYiIHJ4PSIxLjgiIGZpbGw9InVybCgjZykiIG9wYWNpdHk9IjAuNDYiLz4KPC9zdmc+Cg==">
    <title>Login | Subscription Manager Panel</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-gray-200 flex items-center justify-center h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-gray-950 to-black">
    <div class="bg-gray-900/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-800">
        <div class="flex justify-center mb-6">
            <div class="bg-indigo-500/20 p-4 rounded-full border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <svg class="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
        </div>
        <h1 class="text-2xl font-bold text-center mb-8 text-white">Login</h1>
        ${customMessage ? `<div class="bg-orange-500/10 border border-orange-500/50 text-orange-400 p-3 rounded-xl mb-6 text-sm text-center font-medium">${customMessage}</div>` : (showError ? `<div class="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm text-center font-medium">Incorrect password.</div>` : '')}
        <form method="POST" action="${PANEL_PATH}/login" class="space-y-6">
            <div class="relative">
                <input type="password" id="loginPassword" name="password" required dir="ltr" class="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="••••••••">
                <button type="button" id="togglePasswordBtn" aria-label="Show/hide password" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                    <svg id="eyeIconShow" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    <svg id="eyeIconHide" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path></svg>
                </button>
            </div>
            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20">Sign In</button>
        </form>
    </div>
    <script>
        document.getElementById('togglePasswordBtn').addEventListener('click', function () {
            var input = document.getElementById('loginPassword');
            var showIcon = document.getElementById('eyeIconShow');
            var hideIcon = document.getElementById('eyeIconHide');
            var isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            showIcon.classList.toggle('hidden', isHidden);
            hideIcon.classList.toggle('hidden', !isHidden);
        });
    </script>
</body>
</html>`;
}

function getDashboardHTML(baseUrl) {
    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4KPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzgxOGNmOCIvPgo8c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iI2MwODRmYyIvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM3ZGQzZmMiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8cmVjdCB4PSIxIiB5PSIxIiB3aWR0aD0iMjIiIGhlaWdodD0iMjIiIHJ4PSI2IiBmaWxsPSIjMGIwZjFhIi8+CjxyZWN0IHg9IjQuMiIgeT0iNS4zIiB3aWR0aD0iMTMuNSIgaGVpZ2h0PSIzLjYiIHJ4PSIxLjgiIGZpbGw9InVybCgjZykiLz4KPHJlY3QgeD0iNC4yIiB5PSIxMC4yIiB3aWR0aD0iMTUuNiIgaGVpZ2h0PSIzLjYiIHJ4PSIxLjgiIGZpbGw9InVybCgjZykiIG9wYWNpdHk9IjAuNzIiLz4KPHJlY3QgeD0iNC4yIiB5PSIxNS4xIiB3aWR0aD0iMTAuNCIgaGVpZ2h0PSIzLjYiIHJ4PSIxLjgiIGZpbGw9InVybCgjZykiIG9wYWNpdHk9IjAuNDYiLz4KPC9zdmc+Cg==">
    <title>پنل مدیریت سابسکریپشن</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Vazirmatn', sans-serif; }
        .glass-panel { background: rgba(17, 24, 39, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(55, 65, 81, 0.5); }
    </style>
</head>
<body class="bg-gray-950 text-gray-200 min-h-screen">
    <div class="max-w-6xl mx-auto p-6">
        <div class="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 mb-6">
            <div>
                <h1 class="text-2xl font-black tracking-tight bg-gradient-to-l from-indigo-300 via-purple-300 to-sky-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(129,140,248,0.25)]">پنل مدیریت سابسکریپشن</h1>
                <p class="text-xs text-gray-500 mt-0.5">مدیریت منابع، لیست‌های آی‌پی تمیز، و اتصال کلودفلر</p>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="syncAll()" class="text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-4 py-2 rounded-lg transition border border-indigo-500/20 flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    همگام‌سازی همه
                </button>
                <a href="${PANEL_PATH}/logout" class="text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-lg transition border border-red-500/20 flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    خروج
                </a>
            </div>
        </div>

        <div id="password-warning" class="hidden bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-6 text-sm">
            ⚠️ شما هنوز از رمز پیش‌فرض ناامن استفاده می‌کنید. حتماً یک ADMIN_PASSWORD قوی (از نوع Secret) تنظیم کنید.
        </div>

        <!-- Layout intent (see repo README for the reasoning): on mobile, both
             columns below become "contents" (invisible for layout purposes),
             so all six sections turn into independent top-level flex items and
             fall into a single reading order via their order-N classes: usage,
             create-subscription, subscriptions, clean-ip-lists, cf-api, backup.
             On desktop (lg+), each wrapper becomes a real flex column instead:
             the wider "right" column (create + subscriptions + cf-api, the
             three most content-heavy/most-used-together sections) and the
             narrower "left" column (usage + clean-ip + backup, the sections
             people check often but don't need much space for, or set up once
             and rarely touch again). -->
        <div class="flex flex-col lg:flex-row gap-6"><div class="contents lg:flex lg:flex-col lg:gap-6 lg:w-2/3 lg:order-1"><div class="order-2 lg:order-none glass-panel p-6 rounded-2xl relative overflow-hidden">
<h2 class="text-lg font-bold mb-4 text-white flex items-center gap-2">
<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                        ایجاد سابسکریپشن جدید

                    </h2>
<p class="text-xs text-gray-500 mb-4">یک سابسکریپشن می‌تواند شامل چند لینک منبع، چند کانفیگ مستقیم، یا ترکیبی از هر دو باشد - هر لینک/بلوک، یک «بخش» کاملاً مستقل با تنظیمات خودش می‌شود.</p>
<div class="space-y-4">
<div>
<label class="block text-sm mb-2 text-gray-400">نام نمایشی</label>
<input class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 focus:outline-none focus:border-purple-500 text-sm" id="sourceName" placeholder="مثلاً: سرور آلمان ۱" type="text"/>
</div>
<div>
<label class="block text-sm mb-2 text-gray-400">لینک‌های منبع (اختیاری - هر خط یک لینک)</label>
<textarea class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 focus:outline-none focus:border-purple-500 text-sm font-mono" dir="ltr" id="sourceUrls" placeholder="https://...&#10;https://..." rows="3"></textarea>
</div>
<div>
<label class="block text-sm mb-2 text-gray-400">کانفیگ‌های مستقیم (اختیاری - هر خط یک کانفیگ)</label>
<textarea class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 focus:outline-none focus:border-purple-500 text-sm font-mono" dir="ltr" id="sourceManual" placeholder="vless://..." rows="4"></textarea>
<div class="flex flex-wrap items-center gap-1.5 mt-2" dir="ltr">
<span class="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full font-mono">VLESS</span>
<span class="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full font-mono">Trojan</span>
<span class="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full font-mono">Shadowsocks</span>
<span class="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full font-mono">VMess</span>
</div>
</div>
<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
<div>
<label class="block text-xs mb-2 text-gray-400 font-bold">نوع کانفیگ‌ها</label>
<div class="grid grid-cols-2 gap-2">
<label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer">
<input checked="" class="text-indigo-600" id="catCloudflare" name="sourceCategory" type="radio" value="cloudflare"/>
<span class="text-xs text-gray-300">کانفیگ ورکر</span>
</label>
<label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer">
<input class="text-indigo-600" id="catIndependent" name="sourceCategory" type="radio" value="independent"/>
<span class="text-xs text-gray-300">کانفیگ مستقل</span>
</label>
</div>
</div>
<div class="flex items-center gap-2">
<input checked="" class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600" id="sourceUseCleanIp" type="checkbox"/>
<label class="text-xs text-gray-400" for="sourceUseCleanIp">استفاده از آی‌پی تمیز جایگزین</label>
</div>
<p class="text-[11px] text-gray-500">این‌ها فقط مقدار اولیه‌اند؛ بعداً از «ویرایش» می‌توانید هر بخش را جداگانه تنظیم کنید (پورت‌ها، لیست آی‌پی، نحوه‌ی توزیع، به‌روزرسانی خودکار و ...).</p>
</div>
<button class="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-white shadow-lg shadow-purple-600/20" onclick="addSource()">
                            ساخت سابسکریپشن جدید
                        </button>
</div>
</div><div class="order-3 lg:order-none glass-panel p-6 rounded-2xl">
<h2 class="text-lg font-bold mb-4 text-white flex items-center gap-2">
<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M13.828 10.172a4 4 0 010 5.656l-4 4a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l4-4a4 4 0 015.656 5.656l-1.5 1.5" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                        سابسکریپشن‌ها
                        <span class="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-normal" id="sourcesCountBadge"></span>
</h2>
<div class="space-y-3" id="subsList"></div>
</div><div class="order-3 lg:order-none hidden glass-panel p-6 rounded-2xl" id="configEditorPanel">
<div class="flex justify-between items-center mb-4">
<h2 class="text-lg font-bold text-white" id="editorTitle">تنظیمات سابسکریپشن</h2>
<button class="text-gray-400 hover:text-white text-sm" onclick="closeConfigEditor()">بستن ✕</button>
</div>
<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-3 mb-4">
<label class="block text-xs text-gray-400 mb-1.5">آدرس سابسکریپشن</label>
<div class="text-[11px] text-gray-500 truncate mb-1.5" id="editorLinkOrigin" dir="ltr"></div>
<div class="flex items-center gap-2" dir="ltr">
<input class="flex-1 min-w-0 bg-gray-950 border border-gray-700 rounded-lg p-1.5 text-xs font-mono" id="editorSlugInput" type="text"/>
<button class="text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 transition shrink-0" onclick="saveSourceSlug()" dir="rtl">ذخیره</button>
</div>
<p class="text-[11px] text-gray-500 mt-1.5">فقط حروف و عدد انگلیسی، خط تیره و زیرخط؛ بین ۴ تا ۳۲ کاراکتر.</p>
</div>
<p class="text-xs text-gray-500 mb-4">هر لینک/بخش کاملاً مستقل است و تنظیمات خودش را دارد؛ به‌روزرسانی خودکار هم برای هرکدام جداگانه تنظیم می‌شود. فهرست کانفیگ‌های هرکدام همیشه کامل و بدون فیلتر نمایش داده می‌شود؛ فیلترها فقط روی خروجی نهایی اثر می‌گذارند.</p>
<div class="space-y-5" id="editorPartsContainer"></div>
</div><div class="order-5 lg:order-none glass-panel p-6 rounded-2xl">
<h2 class="text-lg font-bold mb-2 text-white flex items-center gap-2">
<svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    اتصال به API کلودفلر
                </h2>
<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-3 mb-4 text-[11px] text-gray-400 leading-relaxed space-y-1">
<strong class="block text-gray-300 mb-1">این بخش کاملاً اختیاری است و فقط برای دیدن آمار مصرف Workers است:</strong>
<p>۱) روی دکمه‌ی «ساخت خودکار توکن در کلودفلر» بزنید.</p>
<p>۲) در صفحه باز شده دکمه‌ی <b>Continue to summary</b> و بعد <b>Create Token</b> را بزنید و توکن را کپی کنید.</p>
<p>۳) در داشبورد کلودفلر از بخش Workers &amp; Pages آیدی اکانت را پیدا و کپی کنید.</p>
<p>۴) نام دلخواه، آیدی و توکن را در قسمت پایین وارد کرده و «افزودن و بررسی» را بزنید.</p>
</div>
<a class="w-full flex items-center justify-center gap-2 text-center bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 py-2.5 rounded-xl text-xs font-bold transition mb-4" href="https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22account_analytics%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%5D&amp;accountId=*&amp;name=SubManager-Stats-Token" target="_blank">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    ساخت خودکار توکن در کلودفلر
                </a>
<div class="space-y-2 mb-4" id="cfConnectionsList"></div>
<div class="space-y-3 mb-2 bg-gray-900/50 border border-gray-800 rounded-xl p-3">
<div>
<label class="block text-xs mb-1 text-gray-400">نام نمایشی اکانت در پنل</label>
<input class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:outline-none focus:border-orange-500 text-sm" id="newCf-label" type="text"/>
</div>
<div>
<label class="block text-xs mb-1 text-gray-400">Account ID</label>
<input class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:outline-none focus:border-orange-500 text-sm font-mono text-center" dir="ltr" id="newCf-account" type="text"/>
</div>
<div>
<label class="block text-xs mb-1 text-gray-400">API Token</label>
<input class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:outline-none focus:border-orange-500 text-sm font-mono text-center" dir="ltr" id="newCf-token" type="password"/>
</div>
<button class="w-full flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 py-2.5 rounded-xl text-sm font-bold transition" onclick="addCfConnection()">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    افزودن و بررسی اعتبار
                </button>
</div>
</div></div><div class="contents lg:flex lg:flex-col lg:gap-6 lg:w-1/3 lg:order-2"><div class="order-1 lg:order-none glass-panel p-6 rounded-2xl relative overflow-hidden group">
<div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition duration-700"></div>
<div class="flex justify-between items-start mb-6 relative">
<h2 class="text-lg font-bold flex items-center gap-2 text-white">
<svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                        وضعیت مصرف ورکر
                    </h2>
<button class="text-xs text-indigo-400 hover:text-indigo-300" onclick="fetchAllStats()">بارگذاری مجدد</button>
</div>
<p class="text-xs text-gray-500 mb-4 -mt-4">هر اکانت کلودفلری که در بخش «اتصال به API کلودفلر» اضافه کرده باشید، اینجا جداگانه نمایش داده می‌شود.</p>
<div class="grid grid-cols-1 gap-4 relative" id="cf-stats-cards"></div>
<div class="hidden mt-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 p-3 rounded-lg text-sm flex items-start gap-2" id="cf-no-connections">
<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
<div>
<strong class="block mb-1">هیچ اتصال API ثبت نشده است</strong>
                        برای مشاهده میزان مصرف، در بخش «اتصال به API کلودفلر» یک اکانت اضافه کنید. اگر اصلاً به این آمار نیاز ندارید، همین‌طور که هست هم پنل کاملاً کار می‌کند.
                    </div>
</div>
</div>
<div class="order-4 lg:order-none glass-panel p-6 rounded-2xl">
<h2 class="text-lg font-bold mb-2 text-white flex items-center gap-2">
<svg class="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    لیست‌های آی‌پی تمیز
                </h2>
<p class="text-xs text-gray-400 mb-4 leading-relaxed">می‌توانید چند لیست جدا بسازید و موقع تنظیم هر لینک/بخش از داخل «ویرایش»، انتخاب کنید کدام لیست استفاده شود. لیست پیش‌فرض پنل قابل ویرایش است ولی حذف نمی‌شود.</p>
<div class="space-y-3 mb-4" id="cleanIpListsContainer"></div>
<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-3 space-y-2">
<input class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm" id="newListName" placeholder="نام لیست جدید" type="text"/>
<textarea class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 font-mono text-xs" dir="ltr" id="newListIps" placeholder="یک آی‌پی در هر خط" rows="4"></textarea>
<button class="w-full flex items-center justify-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 py-2.5 rounded-xl text-xs font-bold transition" onclick="addCleanIpList()">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    ساخت لیست جدید
                </button>
</div>
</div>
<div class="order-6 lg:order-none glass-panel p-6 rounded-2xl">
<h2 class="text-lg font-bold mb-2 text-white flex items-center gap-2">
<svg class="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M7.5 10.5L12 15m0 0l4.5-4.5M12 15V3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    پشتیبان‌گیری و انتقال
                </h2>
<p class="text-xs text-gray-400 mb-4 leading-relaxed">یک فایل JSON دانلود یا بازیابی می‌کنید - همان فایلی که برای بازگرداندن پنل بعد از یک اشتباه، کوچ کردن به یک ورکر دیگر، یا فرستادن یک نسخه‌ی آماده برای شخص دیگری لازم دارید.</p>
<div>
<label class="block text-xs mb-2 text-gray-400 font-bold">بخش‌های موردنظر (هم برای دانلود، هم برای بازیابی)</label>
<div class="flex flex-col sm:flex-row gap-2 mb-4">
<label class="flex-1 flex items-center gap-1.5 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer min-w-0">
<input checked class="text-rose-600 shrink-0" id="backupSecSources" type="checkbox"/>
<span class="text-[11px] text-gray-300 truncate">سابسکریپشن‌ها</span>
</label>
<label class="flex-1 flex items-center gap-1.5 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer min-w-0">
<input checked class="text-rose-600 shrink-0" id="backupSecLists" type="checkbox"/>
<span class="text-[11px] text-gray-300 truncate">لیست‌های آی‌پی</span>
</label>
<label class="flex-1 flex items-center gap-1.5 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer min-w-0">
<input checked class="text-rose-600 shrink-0" id="backupSecCf" type="checkbox"/>
<span class="text-[11px] text-gray-300 truncate">اتصال‌های API</span>
</label>
</div>
</div>
<button class="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 py-2.5 rounded-xl text-sm font-bold transition mb-4 flex items-center justify-center gap-2" onclick="exportBackup()">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2-8.485A5 5 0 1118 18H7a5 5 0 01-1-9.9V8a5 5 0 019-3.9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    دانلود فایل پشتیبان
                </button>
<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-3 space-y-3">
<div>
<label class="block text-xs mb-2 text-gray-400 font-bold">بازیابی از فایل پشتیبان</label>
<input class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs" id="importFileInput" type="file" accept="application/json"/>
</div>
<div class="grid grid-cols-2 gap-2">
<label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer">
<input checked="" class="text-rose-600" id="importModeMerge" name="importMode" type="radio" value="merge"/>
<span class="text-[11px] text-gray-300">افزودن به موجود</span>
</label>
<label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer">
<input class="text-rose-600" id="importModeReplace" name="importMode" type="radio" value="replace"/>
<span class="text-[11px] text-gray-300">جایگزینی کامل</span>
</label>
</div>
<p class="text-[11px] text-gray-500">«افزودن به موجود» فقط موارد جدید را از بخش‌های تیک‌خورده‌ی بالا اضافه می‌کند. «جایگزینی کامل» فقط همان بخش‌های تیک‌خورده را با محتوای فایل عوض می‌کند (بخش‌های تیک‌نخورده دست‌نخورده می‌مانند) و قابل بازگشت نیست.</p>
<button class="w-full bg-gray-800 hover:bg-gray-700 py-2 rounded-lg text-xs font-bold transition border border-gray-700" onclick="importBackup()">بازیابی از فایل</button>
</div>
</div>
</div></div><p class="text-center text-[11px] text-gray-600 mt-8">
            ساخته شده توسط <bdi><a href="https://github.com/Yarumin" target="_blank" class="text-gray-500 hover:text-gray-300 transition">Yasin</a></bdi> &amp; <bdi><a href="https://claude.ai" target="_blank" class="text-gray-500 hover:text-gray-300 transition">Claude</a></bdi>
            <span class="text-gray-700 mx-1">&middot;</span>
            <bdi class="text-gray-600">v1.0.0</bdi>
        </p>
    </div>

    <div id="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 translate-y-24 opacity-0 transition-all duration-300 z-50">
        <div class="flex items-center gap-3">
            <span id="toast-icon"></span>
            <span id="toast-msg"></span>
        </div>
    </div>

    <script>
        var baseUrl = "${baseUrl}";
        var cleanIpListsCache = [];
        var sourceItemsCache = [];
        var editorSourceId = null;
        // Name overrides typed into the inline editor but not yet sent to the
        // server - cleared on save, on cancel, and whenever the editor is
        // (re)opened for a source. Keyed by configId.
        var pendingNameEdits = {};
        // Everything below mirrors pendingNameEdits' approach: local-only
        // staged edits, kept in memory (not just in the DOM) so they survive
        // a re-render of an unrelated part, and only sent to the server when
        // that part's own "save" button is clicked (see savePartSettings /
        // computePartBatchPayload). All keyed by configId except
        // pendingOrder, which is keyed by partId.
        var pendingDeletes = {};   // configId -> true (marked for deletion)
        var pendingIncluded = {};  // configId -> boolean (checkbox state)
        var pendingOrder = {};     // partId -> [configId, ...] (drag result)
        // Last-fetched parts/lists for the open editor, so a save can
        // compute its batch payload and a single row/part can be
        // re-rendered without waiting on a full server round-trip.
        var editorPartsCache = {};
        var editorPartsOrder = [];
        var editorListsCache = [];

        // Client-side mirror of the server's upload-boost defaults, used
        // only to pre-fill the advanced fields and for the reset button.
        var DEFAULT_UPLOAD_BOOST_CIPHER_SUITES_CLIENT = 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256';
        var DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK_CLIENT = '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["5","94","1"],"delays":["0"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["109","1"],"delays":["1"],"maxSplit":"355"}}]}';

        function resetUploadBoostDefaults(partId) {
            var fpEl = document.getElementById('uploadBoostFp-' + partId);
            var csEl = document.getElementById('uploadBoostCs-' + partId);
            var fmEl = document.getElementById('uploadBoostFm-' + partId);
            if (fpEl) fpEl.value = 'unsafe';
            if (csEl) csEl.value = DEFAULT_UPLOAD_BOOST_CIPHER_SUITES_CLIENT;
            if (fmEl) fmEl.value = DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK_CLIENT;
            showToast('تنظیمات به مقادیر پیش‌فرض برگشت', 'success');
        }

        function escapeHtml(s) {
            var str = (s === null || s === undefined) ? '' : String(s);
            return str.replace(/[&<>"']/g, function (c) {
                if (c === '&') return '&amp;';
                if (c === '<') return '&lt;';
                if (c === '>') return '&gt;';
                if (c === '"') return '&quot;';
                return '&#39;';
            });
        }

        function showToast(msg, type) {
            type = type || 'success';
            var toast = document.getElementById('toast');
            var msgEl = document.getElementById('toast-msg');
            var iconEl = document.getElementById('toast-icon');
            msgEl.textContent = msg;
            if (type === 'success') {
                toast.className = "fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500/90 text-white px-6 py-3 rounded-full shadow-2xl border border-emerald-400 flex items-center gap-3 transform translate-y-0 opacity-100 transition-all duration-300 z-50";
                iconEl.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            } else {
                toast.className = "fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-full shadow-2xl border border-red-400 flex items-center gap-3 transform translate-y-0 opacity-100 transition-all duration-300 z-50";
                iconEl.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            }
            setTimeout(function () {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('translate-y-24', 'opacity-0');
            }, 3000);
        }

        // Maps every error code the server can return to its user-facing
        // message. Kept as its own table (rather than inline strings at each
        // call site) so this is the single place to extend later with an
        // English translation per code.
        var ERROR_MESSAGES = {
            EXPORT_FAILED: 'ساخت فایل پشتیبان ناموفق بود',
            IMPORT_INVALID_BACKUP: 'فایل پشتیبان نامعتبر است یا خراب شده',
            LIST_NAME_REQUIRED: 'یک نام برای این لیست وارد کنید',
            LIST_NEEDS_ONE_IP: 'حداقل یک آی‌پی در لیست لازم است',
            LIST_ADD_FAILED: 'افزودن لیست ناموفق بود',
            LIST_NOT_FOUND: 'لیست یافت نشد',
            LIST_UPDATE_FAILED: 'ویرایش لیست ناموفق بود',
            LIST_DEFAULT_UNDELETABLE: 'لیست پیش‌فرض پنل قابل حذف نیست',
            LIST_DELETE_FAILED: 'حذف لیست ناموفق بود',
            LIST_MAX_IPS: 'حداکثر {limit} آی‌پی در هر لیست مجاز است.',
            LIST_MAX_LISTS: 'حداکثر {limit} لیست مجاز است.',
            SOURCE_NOT_FOUND: 'منبع یافت نشد',
            SOURCE_NEEDS_URL_OR_MANUAL: 'حداقل یک لینک سابسکریپشن یا یک کانفیگ دستی وارد کنید',
            SOURCE_NO_VALID_CONFIGS: 'هیچ کانفیگ معتبری استخراج نشد',
            SOURCE_ADD_FAILED: 'افزودن منبع ناموفق بود',
            SOURCE_DELETE_FAILED: 'حذف ناموفق بود',
            SOURCE_MAX_URLS: 'حداکثر {limit} لینک مجاز است.',
            SOURCE_MAX_MANUAL_LINES: 'حداکثر {limit} خط دستی مجاز است.',
            SLUG_TAKEN: 'این لینک قبلاً برای یک سابسکریپشن دیگر استفاده شده است.',
            SLUG_UPDATE_FAILED: 'تغییر لینک ناموفق بود',
            SLUG_INVALID_FORMAT: 'لینک باید بین {min} تا {max} کاراکتر انگلیسی، عدد، خط تیره یا زیرخط باشد.',
            PART_NOT_FOUND: 'این بخش یافت نشد',
            PART_UPDATE_FAILED: 'به‌روزرسانی ناموفق بود',
            PART_DELETE_FAILED: 'حذف این بخش ناموفق بود',
            CONFIG_BATCH_UPDATE_FAILED: 'ذخیره تغییرات ناموفق بود',
            PART_MAX_CONFIGS: 'این بخش به سقف {limit} قالب رسیده است.',
            PART_MAX_BLOCKED: 'حداکثر {limit} کانفیگ بلاک‌شده در هر بخش مجاز است.',
            PART_MAX_CUSTOM_NAMES: 'سقف تعداد نام‌های سفارشی این بخش ({limit}) پر شده است.',
            PART_OUTPUT_TRUNCATED: 'تعداد کانفیگ نهایی این بخش از سقف مجاز ({limit}) بیشتر بود؛ فقط {kept} کانفیگ از {total} به‌صورت تصادفی در خروجی قرار گرفت.',
            SYNC_FAILED: 'همگام‌سازی ناموفق بود',
            CONFIG_EMPTY: 'کانفیگ خالی است',
            CONFIG_INVALID_FORMAT: 'فرمت کانفیگ نامعتبر است',
            CONFIG_DUPLICATE: 'این کانفیگ از قبل وجود دارد',
            CONFIG_ADD_FAILED: 'افزودن کانفیگ ناموفق بود',
            CONFIG_NOT_FOUND: 'کانفیگ یافت نشد',
            CONFIG_DELETE_FAILED: 'حذف ناموفق بود',
            CONFIG_TOGGLE_FAILED: 'تغییر وضعیت بلاک ناموفق بود',
            CONFIG_BULK_TOGGLE_FAILED: 'تغییر وضعیت گروهی ناموفق بود',
            CONFIG_RENAME_FAILED: 'تغییر نام ناموفق بود',
            CONFIG_REORDER_FAILED: 'تغییر ترتیب ناموفق بود',
            CF_CONNECTION_ADD_FAILED: 'افزودن اتصال API ناموفق بود',
            CF_CONNECTION_DELETE_FAILED: 'حذف اتصال API ناموفق بود',
            CF_CREDENTIALS_REQUIRED: 'لطفاً هم Account ID و هم API Token را وارد کنید',
            CF_TOKEN_INVALID: 'توکن API نامعتبر است یا منقضی شده.',
            CF_ACCOUNT_MISMATCH: 'Account ID نادرست است یا این توکن به این اکانت دسترسی ندارد.',
            CF_VALIDATION_FAILED: 'اتصال به کلودفلر برای اعتبارسنجی ناموفق بود.',
            CLEAN_IP_LIST_EMPTY: 'لیست آی‌پی تمیز انتخاب‌شده خالی است؛ کانفیگ‌های این بخش بدون جایگزینی عبور داده شدند.',
            UNAUTHORIZED: 'نشست شما منقضی شده است. در حال انتقال به صفحه ورود...'
        };

        function translateApiError(result, fallback) {
            if (result && typeof result.error === 'string' && ERROR_MESSAGES[result.error]) {
                var text = ERROR_MESSAGES[result.error];
                var params = result.errorParams || {};
                Object.keys(params).forEach(function (k) {
                    text = text.split('{' + k + '}').join(params[k]);
                });
                return text;
            }
            return fallback;
        }

        function jsonFetch(url, opts) {
            return fetch(url, opts).then(function (res) {
                if (res.status === 401) {
                    showToast(ERROR_MESSAGES.UNAUTHORIZED, 'error');
                    setTimeout(function () { window.location.reload(); }, 1200);
                    return res.json().then(function (result) { return { ok: false, result: result }; }).catch(function () {
                        return { ok: false, result: { success: false, error: 'UNAUTHORIZED' } };
                    });
                }
                return res.json().then(function (result) { return { ok: res.ok, result: result }; });
            });
        }

        function applyCategoryDefault() {
            document.getElementById('sourceUseCleanIp').checked = document.getElementById('catCloudflare').checked;
        }
        document.getElementById('catCloudflare').addEventListener('change', applyCategoryDefault);
        document.getElementById('catIndependent').addEventListener('change', applyCategoryDefault);

        function renderPortCheckboxesInto(container, allPorts, selectedPorts, cssClass) {
            if (!allPorts || allPorts.length === 0) {
                container.innerHTML = '<span class="text-[11px] text-gray-500">هنوز هیچ کانفیگی استخراج نشده.</span>';
                return;
            }
            var out = [];
            for (var i = 0; i < allPorts.length; i++) {
                var p = allPorts[i];
                var isChecked = selectedPorts.indexOf(p) !== -1;
                out.push(
                    '<label class="flex items-center gap-2 bg-gray-900 border border-gray-800 p-2 rounded-lg cursor-pointer hover:bg-gray-800 transition">' +
                    '<input type="checkbox" value="' + p + '" class="' + cssClass + ' form-checkbox h-4 w-4 text-indigo-600 rounded border-gray-700 bg-gray-900"' + (isChecked ? ' checked' : '') + '>' +
                    '<span class="text-xs text-gray-300">' + p + '</span></label>'
                );
            }
            container.innerHTML = out.join('');
        }

        function renderItemCard(item) {
            var updatedStr = item.updatedAt ? new Date(item.updatedAt).toLocaleString('fa-IR') : '—';
            var subLink = baseUrl + '/sub/' + (item.slug || item.id);
            var safeName = escapeHtml(item.name || 'بدون نام');
            var categoryLabel = item.category === 'independent' ? 'سرور مستقل' : (item.category === 'mixed' ? 'ترکیبی' : 'کلودفلر');
            var categoryClass = item.category === 'independent' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : (item.category === 'mixed' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20');
            var partsLabel = (item.partsCount || 0) + ' بخش';

            var warningsHtml = '';
            if (item.truncated) warningsHtml += '<div class="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] p-2 rounded-lg mt-2">⚠️ حداقل یکی از بخش‌های این منبع به سقف تعداد قالب‌ها رسیده.</div>';
            (item.partWarnings || []).forEach(function (w) {
                var msg = translateApiError({ error: w.message, errorParams: w.params }, w.message);
                warningsHtml += '<div class="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] p-2 rounded-lg mt-2">⚠️ ' + escapeHtml(msg) + '</div>';
            });

            return (
                '<div class="bg-gray-900/80 p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition">' +
                    '<div class="flex justify-between items-start mb-2">' +
                        '<div>' +
                            '<h3 class="font-bold text-sm text-gray-200">' + safeName + '</h3>' +
                            '<div class="flex flex-wrap gap-1 mt-1">' +
                                '<span class="text-[10px] px-2 py-0.5 rounded border ' + categoryClass + '">' + categoryLabel + '</span>' +
                                '<span class="text-[10px] px-2 py-0.5 rounded border bg-gray-800 text-gray-400 border-gray-700">' + partsLabel + '</span>' +
                            '</div>' +
                            '<span class="text-[11px] text-gray-500 block mt-1">آپدیت: ' + updatedStr + '</span>' +
                        '</div>' +
                        '<span class="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-1 rounded border border-indigo-500/20">' + item.baseCount + ' قالب &larr; ' + item.finalCount + ' کانفیگ</span>' +
                    '</div>' +
                    warningsHtml +
                    '<div class="flex flex-wrap gap-2 mt-4">' +
                        '<button class="copy-link-btn flex-1 bg-white text-gray-900 hover:bg-gray-200 text-xs font-bold py-2 rounded-lg transition shadow-md" data-link="' + escapeHtml(subLink) + '">کپی لینک</button>' +
                        '<button class="sync-one-btn bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white px-3 py-2 rounded-lg border border-emerald-500/20 transition text-xs font-bold" data-id="' + item.id + '">سینک</button>' +
                        '<button class="edit-configs-btn bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white px-3 py-2 rounded-lg border border-purple-500/20 transition text-xs font-bold" data-id="' + item.id + '" data-name="' + safeName + '">ویرایش</button>' +
                        '<button class="delete-source-btn bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg border border-red-500/20 transition" data-id="' + item.id + '">حذف</button>' +
                    '</div>' +
                '</div>'
            );
        }

        function copyLink(link) {
            navigator.clipboard.writeText(link).then(function () { showToast('لینک کپی شد!'); })
                .catch(function () { showToast('کپی خودکار ممکن نشد - لینک: ' + link, 'error'); });
        }

        function renderCleanIpListsContainer(lists) {
            var wrap = document.getElementById('cleanIpListsContainer');
            if (!lists || lists.length === 0) { wrap.innerHTML = ''; return; }
            wrap.innerHTML = lists.map(function (l) {
                var delBtn = l.builtin ? '<span class="text-[10px] text-gray-600">پیش‌فرض</span>' : '<button class="del-list-btn text-red-400 hover:text-red-300 text-xs" data-id="' + l.id + '">حذف</button>';
                return (
                    '<div class="bg-gray-900/60 border border-gray-800 rounded-lg p-3">' +
                        '<div class="flex items-center justify-between mb-2">' +
                            '<input type="text" class="list-name-input bg-transparent text-sm font-bold text-gray-200 border-b border-transparent focus:border-sky-500 focus:outline-none w-2/3" data-id="' + l.id + '" value="' + escapeHtml(l.name) + '">' +
                            delBtn +
                        '</div>' +
                        '<textarea class="list-ips-input w-full bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono text-[11px]" dir="ltr" rows="3" data-id="' + l.id + '">' + escapeHtml((l.ips || []).join('\\n')) + '</textarea>' +
                        '<button class="save-list-btn w-full mt-2 bg-gray-800 hover:bg-gray-700 py-1.5 rounded-lg text-[11px] font-bold transition border border-gray-700" data-id="' + l.id + '">ذخیره این لیست (' + (l.ips || []).length + ' آی‌پی)</button>' +
                    '</div>'
                );
            }).join('');
        }

        function addCleanIpList() {
            var name = document.getElementById('newListName').value.trim();
            var ips = document.getElementById('newListIps').value.split('\\n').map(function (i) { return i.trim(); }).filter(Boolean);
            if (!name || ips.length === 0) { showToast('نام و حداقل یک آی‌پی لازم است', 'error'); return; }
            jsonFetch('/api/clean-ip-lists', { method: 'POST', body: JSON.stringify({ name: name, ips: ips }) }).then(function (r) {
                if (r.ok && r.result.success) {
                    document.getElementById('newListName').value = '';
                    document.getElementById('newListIps').value = '';
                    showToast('لیست ساخته شد');
                    loadData();
                } else showToast(translateApiError(r.result, 'ساخت لیست ناموفق بود'), 'error');
            }).catch(function () { showToast('خطای شبکه', 'error'); });
        }

        function saveCleanIpList(listId) {
            var name = document.querySelector('.list-name-input[data-id="' + listId + '"]').value.trim();
            var ips = document.querySelector('.list-ips-input[data-id="' + listId + '"]').value.split('\\n').map(function (i) { return i.trim(); }).filter(Boolean);
            jsonFetch('/api/clean-ip-lists/' + listId, { method: 'PUT', body: JSON.stringify({ name: name, ips: ips }) }).then(function (r) {
                if (r.ok && r.result.success) { showToast('لیست ذخیره شد'); loadData(); }
                else showToast(translateApiError(r.result, 'ذخیره ناموفق بود'), 'error');
            }).catch(function () { showToast('خطای شبکه', 'error'); });
        }

        function deleteCleanIpList(listId) {
            if (!confirm('این لیست حذف شود؟')) return;
            jsonFetch('/api/clean-ip-lists/' + listId, { method: 'DELETE' }).then(function (r) {
                if (r.ok && r.result.success) { showToast('حذف شد'); loadData(); }
                else showToast(translateApiError(r.result, 'حذف ناموفق بود'), 'error');
            }).catch(function () { showToast('خطای شبکه', 'error'); });
        }

        document.getElementById('cleanIpListsContainer').addEventListener('click', function (e) {
            var saveBtn = e.target.closest('.save-list-btn');
            if (saveBtn) { saveCleanIpList(saveBtn.getAttribute('data-id')); return; }
            var delBtn = e.target.closest('.del-list-btn');
            if (delBtn) deleteCleanIpList(delBtn.getAttribute('data-id'));
        });

        function renderCfConnectionsList(connections) {
            var wrap = document.getElementById('cfConnectionsList');
            if (!connections || connections.length === 0) { wrap.innerHTML = ''; return; }
            wrap.innerHTML = connections.map(function (c) {
                return (
                    '<div class="flex items-center justify-between bg-gray-900/60 border border-gray-800 rounded-lg p-2 text-xs">' +
                        '<div class="text-gray-300"><b>' + escapeHtml(c.label) + '</b> <span class="text-gray-500" dir="ltr">(' + escapeHtml(c.accountId) + ', ' + escapeHtml(c.tokenPreview) + ')</span></div>' +
                        '<button class="del-cf-btn text-red-400 hover:text-red-300 px-2" data-id="' + c.id + '">حذف</button>' +
                    '</div>'
                );
            }).join('');
        }

        function addCfConnection() {
            var label = document.getElementById('newCf-label').value.trim();
            var accountId = document.getElementById('newCf-account').value.trim();
            var apiToken = document.getElementById('newCf-token').value.trim();
            if (!accountId || !apiToken) { showToast('Account ID و API Token هر دو لازم هستند', 'error'); return; }
            showToast('در حال بررسی اعتبار توکن نزد کلودفلر...');
            jsonFetch('/api/cf-connections', { method: 'POST', body: JSON.stringify({ label: label, accountId: accountId, apiToken: apiToken }) }).then(function (r) {
                if (r.ok && r.result.success) {
                    document.getElementById('newCf-label').value = '';
                    document.getElementById('newCf-account').value = '';
                    document.getElementById('newCf-token').value = '';
                    showToast('اتصال API با موفقیت تأیید و اضافه شد!');
                    loadData();
                } else showToast(translateApiError(r.result, 'اعتبارسنجی ناموفق بود'), 'error');
            }).catch(function () { showToast('خطای شبکه هنگام بررسی اعتبار', 'error'); });
        }

        function deleteCfConnection(id) {
            if (!confirm('این اتصال API حذف شود؟')) return;
            fetch('/api/cf-connections/' + id, { method: 'DELETE' }).then(function () { showToast('حذف شد'); loadData(); })
                .catch(function () { showToast('خطا در حذف', 'error'); });
        }

        document.getElementById('cfConnectionsList').addEventListener('click', function (e) {
            var delBtn = e.target.closest('.del-cf-btn');
            if (delBtn) deleteCfConnection(delBtn.getAttribute('data-id'));
        });

        function statsCardSkeleton(conn) {
            return (
                '<div class="bg-gray-900/50 p-5 rounded-xl border border-gray-800" id="cf-card-' + conn.id + '">' +
                    '<div class="flex items-center justify-between">' +
                        '<div>' +
                            '<span class="text-gray-400 text-sm block mb-1">' + escapeHtml(conn.label) + '</span>' +
                            '<div class="flex items-baseline gap-2">' +
                                '<strong class="cf-req-value text-3xl text-white font-black">---</strong>' +
                                '<span class="text-gray-500 text-sm">/ 100,000 رایگان</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="cf-chart-el w-16 h-16 rounded-full border-4 border-gray-800 flex items-center justify-center relative"><span class="text-xs text-gray-500">%</span></div>' +
                    '</div>' +
                    '<div class="cf-err-box hidden mt-3 text-orange-400 text-[11px]"></div>' +
                '</div>'
            );
        }

        function fetchAllStats() {
            var connections = window.cfConnections || [];
            var cardsEl = document.getElementById('cf-stats-cards');
            var emptyEl = document.getElementById('cf-no-connections');
            if (connections.length === 0) { cardsEl.innerHTML = ''; emptyEl.classList.remove('hidden'); return; }
            emptyEl.classList.add('hidden');
            cardsEl.innerHTML = connections.map(statsCardSkeleton).join('');
            connections.forEach(function (conn) {
                fetch('/api/cf-connections/' + conn.id + '/stats').then(function (res) { return res.json(); }).then(function (data) {
                    var card = document.getElementById('cf-card-' + conn.id);
                    if (!card) return;
                    var reqEl = card.querySelector('.cf-req-value');
                    var errBox = card.querySelector('.cf-err-box');
                    var chartEl = card.querySelector('.cf-chart-el');
                    if (data.error) { reqEl.textContent = '---'; errBox.textContent = data.error; errBox.classList.remove('hidden'); return; }
                    errBox.classList.add('hidden');
                    var endReq = data.requests || 0;
                    reqEl.textContent = endReq.toLocaleString();
                    var percent = Math.min(100, Math.round((endReq / 100000) * 100));
                    chartEl.style.background = 'conic-gradient(#6366f1 ' + percent + '%, transparent 0)';
                    chartEl.innerHTML = '<span class="text-[10px] font-bold text-white relative z-10 bg-gray-900 rounded-full w-12 h-12 flex items-center justify-center">' + percent + '%</span>';
                }).catch(function () { /* stats optional */ });
            });
        }

        function loadData() {
            return fetch('/api/state').then(function (res) { return res.json(); }).then(function (data) {
                document.getElementById('password-warning').classList.toggle('hidden', !data.usingDefaultPassword);
                cleanIpListsCache = data.cleanIpLists || [];
                sourceItemsCache = data.items || [];
                renderCleanIpListsContainer(cleanIpListsCache);
                renderCfConnectionsList(data.cfConnections || []);
                window.cfConnections = data.cfConnections || [];
                var listEl = document.getElementById('subsList');
                var countBadge = document.getElementById('sourcesCountBadge');
                countBadge.textContent = (data.items || []).length + ' مورد';
                if (!data.items || data.items.length === 0) {
                    listEl.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm border border-dashed border-gray-700 rounded-xl flex flex-col items-center gap-2"><svg class="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg><span>هنوز منبعی ساخته نشده - از فرم بالا شروع کنید.</span></div>';
                } else {
                    listEl.innerHTML = data.items.map(renderItemCard).join('');
                }
                fetchAllStats();
            }).catch(function () { showToast('خطا در دریافت اطلاعات', 'error'); });
        }

        function addSource() {
            var name = document.getElementById('sourceName').value || 'منبع جدید';
            var urls = document.getElementById('sourceUrls').value.split('\\n').map(function (i) { return i.trim(); }).filter(Boolean);
            var manual = document.getElementById('sourceManual').value;
            var category = document.getElementById('catIndependent').checked ? 'independent' : 'cloudflare';
            var useCleanIp = document.getElementById('sourceUseCleanIp').checked;
            if (urls.length === 0 && !manual.trim()) { showToast('لطفاً حداقل یک لینک سابسکریپشن یا یک کانفیگ دستی وارد کنید', 'error'); return; }
            showToast('در حال استخراج قالب‌ها و ساخت کانفیگ‌های جدید...');
            jsonFetch('/api/sources', { method: 'POST', body: JSON.stringify({ name: name, urls: urls, manual: manual, category: category, useCleanIp: useCleanIp }) }).then(function (r) {
                if (r.ok && r.result.success) {
                    document.getElementById('sourceUrls').value = '';
                    document.getElementById('sourceManual').value = '';
                    showToast('منبع با موفقیت اضافه شد!');
                    loadData();
                } else showToast(translateApiError(r.result, 'خطا در افزودن منبع'), 'error');
            }).catch(function () { showToast('خطای شبکه', 'error'); });
        }

        function deleteSource(id) {
            if (!confirm('آیا این منبع حذف شود؟')) return;
            fetch('/api/sources/' + id, { method: 'DELETE' }).then(function () {
                showToast('حذف شد');
                if (editorSourceId === id) closeConfigEditor();
                loadData();
            }).catch(function () { showToast('خطا در حذف', 'error'); });
        }

        function syncOneSource(id) {
            showToast('در حال همگام‌سازی این منبع...');
            fetch('/api/sources/' + id + '/sync', { method: 'POST' }).then(function () {
                showToast('همگام‌سازی شد');
                loadData();
                if (editorSourceId === id) refreshConfigEditor();
            }).catch(function () { showToast('خطا در همگام‌سازی', 'error'); });
        }

        function syncAll() {
            showToast('در حال همگام‌سازی همه‌ی منابع...');
            fetch('/api/sync', { method: 'POST' }).then(function () {
                showToast('با موفقیت همگام‌سازی شد!');
                loadData();
                if (editorSourceId) refreshConfigEditor();
            }).catch(function () { showToast('خطا در همگام‌سازی', 'error'); });
        }

        function getSelectedBackupSections() {
            var sections = [];
            if (document.getElementById('backupSecSources').checked) sections.push('sources');
            if (document.getElementById('backupSecLists').checked) sections.push('cleanIpLists');
            if (document.getElementById('backupSecCf').checked) sections.push('cfConnections');
            return sections;
        }

        function exportBackup() {
            var sections = getSelectedBackupSections();
            if (sections.length === 0) { showToast('حداقل یک بخش را انتخاب کنید', 'error'); return; }
            showToast('در حال ساخت فایل پشتیبان...');
            fetch('/api/backup?sections=' + encodeURIComponent(sections.join(','))).then(function (res) {
                if (!res.ok) throw new Error('export failed');
                return res.blob();
            }).then(function (blob) {
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'sub-manager-backup-' + new Date().toISOString().slice(0, 10) + '.json';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                showToast('فایل پشتیبان دانلود شد');
            }).catch(function () { showToast('ساخت فایل پشتیبان ناموفق بود', 'error'); });
        }

        function importBackup() {
            var input = document.getElementById('importFileInput');
            var file = input.files && input.files[0];
            if (!file) { showToast('یک فایل پشتیبان انتخاب کنید', 'error'); return; }
            var sections = getSelectedBackupSections();
            if (sections.length === 0) { showToast('حداقل یک بخش را انتخاب کنید', 'error'); return; }
            var mode = document.getElementById('importModeReplace').checked ? 'replace' : 'merge';
            if (mode === 'replace' && !confirm('این کار بخش‌های تیک‌خورده را با محتوای فایل پشتیبان جایگزین می‌کند و قابل بازگشت نیست. ادامه می‌دهید؟')) return;

            var reader = new FileReader();
            reader.onload = function () {
                var parsed;
                try {
                    parsed = JSON.parse(reader.result);
                } catch (e) {
                    showToast('فایل انتخاب‌شده یک JSON معتبر نیست', 'error');
                    return;
                }
                parsed.__importMode = mode;
                parsed.__importSections = sections;
                showToast('در حال بازیابی از فایل پشتیبان...');
                jsonFetch('/api/backup', { method: 'POST', body: JSON.stringify(parsed) }).then(function (r) {
                    if (r.ok && r.result.success) {
                        var parts = [];
                        if (sections.indexOf('sources') !== -1) parts.push(r.result.sourcesImported + ' سابسکریپشن');
                        if (sections.indexOf('cleanIpLists') !== -1) parts.push(r.result.listsImported + ' لیست آی‌پی');
                        if (sections.indexOf('cfConnections') !== -1) parts.push(r.result.cfConnectionsImported + ' اتصال API');
                        showToast(parts.join('، ') + ' بازیابی شد');
                        input.value = '';
                        loadData();
                    } else {
                        showToast(translateApiError(r.result, 'بازیابی ناموفق بود'), 'error');
                    }
                }).catch(function () { showToast('خطای شبکه', 'error'); });
            };
            reader.onerror = function () { showToast('خواندن فایل ناموفق بود', 'error'); };
            reader.readAsText(file);
        }

        document.getElementById('subsList').addEventListener('click', function (e) {
            var copyBtn = e.target.closest('.copy-link-btn');
            if (copyBtn) { copyLink(copyBtn.getAttribute('data-link')); return; }
            var syncBtn = e.target.closest('.sync-one-btn');
            if (syncBtn) { syncOneSource(syncBtn.getAttribute('data-id')); return; }
            var editBtn = e.target.closest('.edit-configs-btn');
            if (editBtn) { openConfigEditor(editBtn.getAttribute('data-id'), editBtn.getAttribute('data-name')); return; }
            var delBtn = e.target.closest('.delete-source-btn');
            if (delBtn) deleteSource(delBtn.getAttribute('data-id'));
        });

        function openConfigEditor(sourceId, sourceName) {
            editorSourceId = sourceId;
            pendingNameEdits = {};
            pendingDeletes = {};
            pendingIncluded = {};
            pendingOrder = {};
            document.getElementById('editorTitle').textContent = 'تنظیمات سابسکریپشن (' + sourceName + ')';
            document.getElementById('configEditorPanel').classList.remove('hidden');
            var src = (sourceItemsCache || []).find(function (s) { return s.id === sourceId; });
            document.getElementById('editorLinkOrigin').textContent = baseUrl + '/sub/';
            document.getElementById('editorSlugInput').value = src ? src.slug : '';
            refreshConfigEditor().then(function () {
                document.getElementById('configEditorPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }

        function closeConfigEditor() {
            editorSourceId = null;
            pendingNameEdits = {};
            pendingDeletes = {};
            pendingIncluded = {};
            pendingOrder = {};
            document.getElementById('configEditorPanel').classList.add('hidden');
            document.getElementById('editorPartsContainer').innerHTML = '';
        }

        function saveSourceSlug() {
            if (!editorSourceId) return;
            var input = document.getElementById('editorSlugInput');
            var slug = input.value.trim();
            jsonFetch('/api/sources/' + editorSourceId + '/slug', {
                method: 'PUT',
                body: JSON.stringify({ slug: slug })
            }).then(function (r) {
                if (r.ok && r.result.success) {
                    if (!r.result.unchanged) showToast('آدرس سابسکریپشن به‌روزرسانی شد');
                    input.value = r.result.slug;
                    loadData();
                } else {
                    showToast(translateApiError(r.result, 'تغییر لینک ناموفق بود'), 'error');
                }
            }).catch(function () { showToast('خطای شبکه', 'error'); });
        }

        function refreshConfigEditor() {
            if (!editorSourceId) return Promise.resolve();
            // Deliberately NOT clearing pendingNameEdits here - renderPartCard
            // reads from it, so an unsaved rename survives a refresh caused by
            // an unrelated action (blocking another config, reordering, etc.)
            // in the same part. It's only cleared on save, on Escape, and when
            // the editor is (re)opened for a source (see openConfigEditor).
            return fetch('/api/sources/' + editorSourceId + '/configs').then(function (res) { return res.json(); }).then(function (data) {
                var container = document.getElementById('editorPartsContainer');
                var lists = data.cleanIpLists || [];
                var parts = data.parts || [];
                editorListsCache = lists;
                editorPartsCache = {};
                editorPartsOrder = parts.map(function (p) { return p.id; });
                parts.forEach(function (p) { editorPartsCache[p.id] = p; });
                if (parts.length === 0) {
                    container.innerHTML = '<div class="text-center text-gray-500 py-4 text-sm border border-dashed border-gray-700 rounded-xl">این منبع هنوز هیچ بخشی ندارد.</div>';
                } else {
                    container.innerHTML = parts.map(function (part, idx) { return renderPartCard(part, lists, idx); }).join('');
                    parts.forEach(function (part) {
                        var portsContainer = document.getElementById('ports-' + part.id);
                        if (portsContainer) renderPortCheckboxesInto(portsContainer, part.availablePorts, part.selectedPorts, 'port-cb-' + part.id);
                    });
                    // indeterminate can only be set via the DOM property, not
                    // an HTML attribute - applied here right after the markup
                    // lands, for any select-all checkbox in a "some but not
                    // all" state (see renderPartCard).
                    Array.prototype.slice.call(container.querySelectorAll('.select-all-cb[data-indeterminate]')).forEach(function (cb) {
                        cb.indeterminate = true;
                    });
                }
                renderManualAddCard(lists, parts);
            }).catch(function () { showToast('خطا در دریافت کانفیگ‌ها', 'error'); });
        }

        function partTitle(part, idx) {
            if (part.kind === 'manual') return 'کانفیگ‌های دستی';
            return 'منبع ' + (idx + 1);
        }

        function cleanIpListOptionsHtml(lists, selectedId) {
            return lists.map(function (l) {
                var sel = l.id === selectedId ? ' selected' : '';
                return '<option value="' + l.id + '"' + sel + '>' + escapeHtml(l.name) + ' (' + (l.ips || []).length + ')</option>';
            }).join('');
        }

        var TRASH_ICON = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
        var UNDO_ICON = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
        var DRAG_HANDLE_ICON = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.4"></circle><circle cx="9" cy="12" r="1.4"></circle><circle cx="9" cy="18" r="1.4"></circle><circle cx="15" cy="6" r="1.4"></circle><circle cx="15" cy="12" r="1.4"></circle><circle cx="15" cy="18" r="1.4"></circle></svg>';

        // Applies pendingOrder (a drag result, if this part has one) to the
        // part's server-fetched config list, without mutating either.
        function orderedConfigsForPart(part) {
            var list = part.configs || [];
            var order = pendingOrder[part.id];
            if (!order) return list;
            var byId = {};
            list.forEach(function (c) { byId[c.configId] = c; });
            var result = [];
            order.forEach(function (id) { if (byId[id]) { result.push(byId[id]); delete byId[id]; } });
            Object.keys(byId).forEach(function (id) { result.push(byId[id]); });
            return result;
        }

        // One config row. Reads pendingDeletes/pendingIncluded/pendingNameEdits
        // so it reflects any unsaved local edit, and is used both for the
        // full part render and to patch a single row in place (see
        // toggleDeletePending) without a full re-render.
        function renderConfigRow(c, part) {
            var badgeColor = 'bg-purple-500/20 text-purple-300';
            if (c.protocol === 'vless') badgeColor = 'bg-indigo-500/20 text-indigo-300';
            else if (c.protocol === 'trojan') badgeColor = 'bg-emerald-500/20 text-emerald-300';
            var tlsBadge = c.isTls ? '<span class="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded">TLS</span>' : '<span class="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded">non-TLS</span>';
            var portBadge = '<span class="text-[10px] bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded">' + escapeHtml(c.port || '?') + '</span>';
            var isDeleted = !!pendingDeletes[c.configId];
            var included = pendingIncluded.hasOwnProperty(c.configId) ? pendingIncluded[c.configId] : !c.blocked;
            var rowClass = isDeleted
                ? 'bg-gray-900/20 border border-dashed border-gray-700 rounded-lg p-2 opacity-40'
                : (included ? 'bg-gray-900/60 border border-gray-800 rounded-lg p-2' : 'bg-gray-900/30 border border-red-900/40 rounded-lg p-2 opacity-50');
            var pendingName = pendingNameEdits.hasOwnProperty(c.configId) ? pendingNameEdits[c.configId] : null;
            var effectiveName = pendingName !== null ? (pendingName || c.name || 'AutoSub') : (c.customName || c.name || 'AutoSub');

            var nameHtml = isDeleted
                ? '<span class="flex-1 min-w-0 truncate text-xs text-gray-500 line-through">' + escapeHtml(effectiveName) + '</span>'
                : ('<span class="cfg-name-wrap flex items-baseline gap-1 min-w-0 flex-1 basis-32" data-part="' + part.id + '" data-id="' + c.configId + '" data-default-name="' + escapeHtml(c.name || 'AutoSub') + '" data-saved-custom="' + escapeHtml(c.customName || '') + '" data-host="' + escapeHtml(c.host || '') + '">' +
                    '<span class="cfg-name-display flex-1 min-w-0 truncate text-xs text-gray-300 cursor-text hover:text-white transition" title="برای تغییر نام این کانفیگ کلیک کنید">' + escapeHtml(effectiveName) + '</span>' +
                    '<span class="max-w-[45%] min-w-0 shrink truncate text-[11px] text-gray-600" title="' + escapeHtml(c.host || '') + '">(' + escapeHtml(c.host || '') + ')</span>' +
                '</span>');
            var deleteBtn = isDeleted
                ? '<button class="undo-delete-config-btn text-emerald-400 hover:text-emerald-300 px-1" title="بازگردانی" data-part="' + part.id + '" data-id="' + c.configId + '">' + UNDO_ICON + '</button>'
                : '<button class="delete-config-btn text-red-400 hover:text-red-300 px-1" title="حذف" data-part="' + part.id + '" data-id="' + c.configId + '">' + TRASH_ICON + '</button>';
            var checkboxHtml = isDeleted
                ? '<span class="h-4 w-4 shrink-0 inline-block"></span>'
                : '<input type="checkbox" class="config-include-cb h-4 w-4 rounded border-gray-700 bg-gray-900 text-emerald-500 shrink-0" title="استفاده در خروجی نهایی" data-part="' + part.id + '" data-id="' + c.configId + '"' + (included ? ' checked' : '') + '>';
            var dragHandle = isDeleted
                ? '<span class="w-4 h-4 shrink-0 text-gray-700">' + DRAG_HANDLE_ICON + '</span>'
                : '<span class="drag-handle-btn text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing shrink-0" style="touch-action:none" title="برای جابه‌جایی نگه دارید و بکشید" data-part="' + part.id + '" data-id="' + c.configId + '">' + DRAG_HANDLE_ICON + '</span>';

            // One single flex-wrap row, in this order: drag handle, checkbox,
            // name+host (kept adjacent, name has priority and shrinks last),
            // the delete button, then the protocol/TLS/port badges last. On a
            // narrow screen flex-wrap sends whatever doesn't fit onto a
            // second line automatically - normally that's just the badges.
            return (
                '<div class="' + rowClass + '" data-config-id="' + c.configId + '" dir="ltr">' +
                    '<div class="flex items-center flex-wrap gap-2">' +
                        dragHandle +
                        checkboxHtml +
                        nameHtml +
                        '<div class="flex items-center gap-1 shrink-0">' + deleteBtn + '</div>' +
                        '<div class="flex items-center gap-1.5 shrink-0">' +
                            '<span class="text-[10px] font-bold px-2 py-0.5 rounded ' + badgeColor + '">' + String(c.protocol || '?').toUpperCase() + '</span>' +
                            tlsBadge + portBadge +
                        '</div>' +
                    '</div>' +
                '</div>'
            );
        }

        function renderPartCard(part, lists, idx) {
            var fetchBadge = '';
            if (part.kind === 'url') {
                if (part.lastFetchOk === false) {
                    fetchBadge = '<span title="آخرین واکشی ناموفق - نسخه‌ی قبلی حفظ شد" class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg></span>';
                } else if (part.lastFetchOk === true) {
                    fetchBadge = '<span title="آخرین واکشی موفق" class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></span>';
                }
            }
            var deletePartBtn = '<button class="delete-part-btn text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 rounded transition shrink-0" title="حذف این بخش" data-part="' + part.id + '">' + TRASH_ICON + '</button>';
            var urlBox = part.kind === 'url' ? '<div class="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 mb-3 text-[11px] text-gray-500 truncate" dir="ltr">' + escapeHtml(part.url || '') + '</div>' : '';

            var orderedConfigs = orderedConfigsForPart(part);
            var configRows = orderedConfigs.map(function (c) { return renderConfigRow(c, part); }).join('') || '<div class="text-center text-gray-600 text-xs py-3">هنوز کانفیگی در این بخش نیست.</div>';

            var visibleConfigs = orderedConfigs.filter(function (c) { return !pendingDeletes[c.configId]; });
            var isIncludedNow = function (c) { return pendingIncluded.hasOwnProperty(c.configId) ? pendingIncluded[c.configId] : !c.blocked; };
            var allIncluded = visibleConfigs.length > 0 && visibleConfigs.every(isIncludedNow);
            var noneIncluded = visibleConfigs.length > 0 && visibleConfigs.every(function (c) { return !isIncludedNow(c); });
            var selectAllRow = visibleConfigs.length > 0 ? (
                '<div class="flex items-center gap-2 mb-2" dir="ltr">' +
                    '<input type="checkbox" class="select-all-cb h-4 w-4 rounded border-gray-700 bg-gray-900 text-emerald-500" data-part="' + part.id + '"' + (allIncluded ? ' checked' : '') + (!allIncluded && !noneIncluded ? ' data-indeterminate="1"' : '') + '>' +
                    '<label class="text-[11px] text-gray-500">انتخاب/لغو</label>' +
                '</div>'
            ) : '';

            var rangeOnlyBlock = (
                '<div>' +
                    '<div class="flex items-center gap-2">' +
                        '<input type="checkbox" id="matchRanges-' + part.id + '"' + (part.matchKnownRangesOnly !== false ? ' checked' : '') + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600">' +
                        '<label for="matchRanges-' + part.id + '" class="text-xs text-gray-400">فقط جایگزینی هاست‌های کلودفلر</label>' +
                    '</div>' +
                    '<p class="text-[11px] text-gray-500 mt-1 pr-6">روشن: فقط هاست‌هایی که همین الان یک آی‌پی کلودفلر هستند جایگزین می‌شوند. خاموش: هاست همه‌ی کانفیگ‌های این بخش جایگزین می‌شود.</p>' +
                '</div>'
            );

            var autoRefreshBlock = part.kind === 'url' ? (
                '<div class="bg-gray-950/60 border border-gray-800 rounded-lg p-2.5 space-y-2">' +
                    '<div class="flex items-center gap-2">' +
                        '<input type="checkbox" id="autoRefresh-' + part.id + '"' + (part.autoRefreshEnabled !== false ? ' checked' : '') + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600">' +
                        '<label for="autoRefresh-' + part.id + '" class="text-xs text-gray-400">به‌روزرسانی خودکار این لینک</label>' +
                    '</div>' +
                    '<div class="flex items-center gap-2">' +
                        '<span class="text-[11px] text-gray-500 shrink-0">هر</span>' +
                        '<input type="number" id="autoRefreshMinutes-' + part.id + '" min="15" value="' + (part.autoRefreshMinutes || 1440) + '" class="w-24 bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-xs">' +
                        '<span class="text-[11px] text-gray-500 shrink-0">دقیقه</span>' +
                    '</div>' +
                '</div>'
            ) : '';

            // TLS fingerprint/cipher/fragment spoofing to help configs pass
            // DPI/JA3-JA4 classification - method from Patternia. Off by
            // default; only touches VLESS/Trojan configs with security=tls
            // or security=reality - see applyUploadBoost.
            var uploadBoostBlock = (
                '<div class="bg-gray-950/60 border border-gray-800 rounded-lg p-3 space-y-3">' +
                    '<div class="flex items-center justify-between">' +
                        '<div class="flex items-center gap-2">' +
                            '<input type="checkbox" id="uploadBoost-' + part.id + '"' + (part.uploadBoostEnabled ? ' checked' : '') + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-purple-600">' +
                            '<label for="uploadBoost-' + part.id + '" class="text-xs text-gray-300 font-bold">رفع محدودیت آپلود / دور زدن فیلتر دامنه</label>' +
                        '</div>' +
                        '<span class="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full shrink-0">فقط کانفیگ‌های TLS</span>' +
                    '</div>' +
                    '<p class="text-[11px] text-gray-500 leading-relaxed">با روش پترنیها، اثر انگشت TLS و تنظیمات فرگمنت را روی کانفیگ‌های TLS تغییر می‌دهد تا شناسایی و محدودسازی توسط فیلترینگ سخت‌تر شود.</p>' +
                    '<p class="text-[10px] text-gray-600 leading-relaxed">کلاینت پیشنهادی سازگار با این روش : <a href="https://github.com/patterniha/PattN/releases" target="_blank" rel="noopener" class="text-purple-400 hover:text-purple-300 underline">PattN</a>/<a href="https://github.com/patterniha/PattNG/releases" target="_blank" rel="noopener" class="text-purple-400 hover:text-purple-300 underline">PattNG</a></p>' +
                    '<p class="text-[10px] text-gray-600 leading-relaxed">فقط کانفیگ‌های VLESS/Trojan را تحت‌تأثیر قرار می‌دهد.</p>' +
                    '<details class="bg-gray-900/50 border border-gray-800 rounded-lg">' +
                        '<summary class="p-2 text-[11px] text-gray-400 cursor-pointer hover:text-gray-300">تنظیمات پیشرفته (اختیاری)</summary>' +
                        '<div class="p-3 space-y-2">' +
                            '<div>' +
                                '<label class="block text-[10px] mb-1 text-gray-500">نوع اثر انگشت (fp)</label>' +
                                '<select id="uploadBoostFp-' + part.id + '" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs" dir="ltr">' +
                                    '<option value="unsafe"' + (part.uploadBoostFingerprint === 'unsafe' ? ' selected' : '') + '>unsafe (پیشنهادی)</option>' +
                                    '<option value="chrome"' + (part.uploadBoostFingerprint === 'chrome' ? ' selected' : '') + '>chrome</option>' +
                                    '<option value="firefox"' + (part.uploadBoostFingerprint === 'firefox' ? ' selected' : '') + '>firefox</option>' +
                                    '<option value="safari"' + (part.uploadBoostFingerprint === 'safari' ? ' selected' : '') + '>safari</option>' +
                                    '<option value="random"' + (part.uploadBoostFingerprint === 'random' ? ' selected' : '') + '>random</option>' +
                                    '<option value="none"' + (part.uploadBoostFingerprint === 'none' ? ' selected' : '') + '>none</option>' +
                                '</select>' +
                            '</div>' +
                            '<div>' +
                                '<label class="block text-[10px] mb-1 text-gray-500">لیست رمزنگاری‌ها (cs) - فقط برای security=tls</label>' +
                                '<textarea id="uploadBoostCs-' + part.id + '" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono text-[10px]" dir="ltr" rows="2">' + escapeHtml(part.uploadBoostCipherSuites || DEFAULT_UPLOAD_BOOST_CIPHER_SUITES_CLIENT) + '</textarea>' +
                            '</div>' +
                            '<div>' +
                                '<label class="block text-[10px] mb-1 text-gray-500">تنظیمات فرگمنت (fm) - فقط برای security=tls</label>' +
                                '<textarea id="uploadBoostFm-' + part.id + '" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono text-[10px]" dir="ltr" rows="3">' + escapeHtml(part.uploadBoostFragmentMask || DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK_CLIENT) + '</textarea>' +
                            '</div>' +
                            '<button type="button" class="reset-upload-boost-btn text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1.5 rounded-lg border border-gray-700 transition" data-part="' + part.id + '">🔄 بازنشانی به پیش‌فرض</button>' +
                        '</div>' +
                    '</details>' +
                '</div>'
            );

            return (
                '<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-4" data-part-card="' + part.id + '">' +
                    '<div class="flex items-center justify-between gap-2 mb-2">' +
                        '<h3 class="text-sm font-bold text-white truncate">' + partTitle(part, idx) + '</h3>' +
                        '<div class="flex items-center gap-1.5 shrink-0">' + fetchBadge + deletePartBtn + '</div>' +
                    '</div>' +
                    urlBox +
                    '<div class="space-y-3 mb-4 pb-4 border-b border-gray-800">' +
                        '<div class="grid grid-cols-2 gap-2">' +
                            '<label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer">' +
                                '<input type="radio" name="cat-' + part.id + '" value="cloudflare" id="catCf-' + part.id + '"' + (part.category !== 'independent' ? ' checked' : '') + ' class="text-indigo-600">' +
                                '<span class="text-xs text-gray-300">کانفیگ ورکر</span>' +
                            '</label>' +
                            '<label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer">' +
                                '<input type="radio" name="cat-' + part.id + '" value="independent" id="catInd-' + part.id + '"' + (part.category === 'independent' ? ' checked' : '') + ' class="text-indigo-600">' +
                                '<span class="text-xs text-gray-300">کانفیگ مستقل</span>' +
                            '</label>' +
                        '</div>' +
                        '<div class="flex items-center gap-2">' +
                            '<input type="checkbox" id="useCleanIp-' + part.id + '"' + (part.useCleanIp ? ' checked' : '') + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600">' +
                            '<label for="useCleanIp-' + part.id + '" class="text-xs text-gray-400">استفاده از آی‌پی تمیز جایگزین</label>' +
                        '</div>' +
                        // Always rendered (not just for 'independent' parts) so
                        // switching category can reveal/hide it instantly on
                        // the client without waiting for a save+reload - see
                        // the 'cat-' radio change handler below.
                        '<div id="rangeOnlyWrap-' + part.id + '"' + (part.category === 'independent' ? '' : ' class="hidden"') + '>' + rangeOnlyBlock + '</div>' +
                        '<div>' +
                            '<label class="block text-[11px] mb-1 text-gray-500">لیست آی‌پی تمیز</label>' +
                            '<select id="listId-' + part.id + '" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs">' + cleanIpListOptionsHtml(lists, part.cleanIpListId) + '</select>' +
                        '</div>' +
                        '<div>' +
                            '<label class="block text-[11px] mb-1 text-gray-500">نحوه‌ی توزیع آی‌پی</label>' +
                            '<div class="grid grid-cols-2 gap-2">' +
                                '<label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer">' +
                                    '<input type="radio" name="dist-' + part.id + '" value="multiply" id="distMul-' + part.id + '"' + (part.distribution !== 'random' ? ' checked' : '') + ' class="text-indigo-600">' +
                                    '<span class="text-[11px] text-gray-300">تکثیر</span>' +
                                '</label>' +
                                '<label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer">' +
                                    '<input type="radio" name="dist-' + part.id + '" value="random" id="distRand-' + part.id + '"' + (part.distribution === 'random' ? ' checked' : '') + ' class="text-indigo-600">' +
                                    '<span class="text-[11px] text-gray-300">تصادفی</span>' +
                                '</label>' +
                            '</div>' +
                        '</div>' +
                        '<div>' +
                            '<label class="block text-[11px] mb-1 text-gray-500">پورت‌های مورد نیاز (خالی = همه)</label>' +
                            '<div id="ports-' + part.id + '" class="grid grid-cols-4 gap-2"></div>' +
                        '</div>' +
                        '<div>' +
                            '<div class="flex items-center gap-2">' +
                                '<input type="checkbox" id="oneConfigPerPort-' + part.id + '"' + (part.oneConfigPerPort ? ' checked' : '') + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-amber-500">' +
                                '<label for="oneConfigPerPort-' + part.id + '" class="text-xs text-gray-400">یک کانفیگ برای هر مقصد</label>' +
                            '</div>' +
                            '<p class="text-[11px] text-gray-500 mt-1 pr-6">از بین کانفیگ‌هایی که سرور و پورت مقصدشان یکسان است، هر بار فقط یکی به‌صورت تصادفی در خروجی نهایی استفاده می‌شود.</p>' +
                        '</div>' +
                        autoRefreshBlock +
                        uploadBoostBlock +
                        (part.truncated ? '<div class="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-2 rounded-lg text-[11px]">⚠️ این بخش به سقف تعداد قالب‌ها رسیده.</div>' : '') +
                        '<button class="save-part-btn w-full bg-gray-800 hover:bg-gray-700 py-2 rounded-lg text-xs font-bold transition border border-gray-700" data-part="' + part.id + '">ذخیره تنظیمات این بخش</button>' +
                    '</div>' +
                    selectAllRow +
                    '<div class="space-y-2 mb-3" id="configRows-' + part.id + '">' + configRows + '</div>' +
                    '<div class="flex gap-2">' +
                        '<input type="text" id="newConfig-' + part.id + '" class="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs font-mono" dir="ltr" placeholder="vless://...">' +
                        '<button class="add-config-btn bg-purple-600 hover:bg-purple-500 px-4 rounded-lg text-sm font-bold text-white" data-part="' + part.id + '">افزودن</button>' +
                    '</div>' +
                '</div>'
            );
        }

        function renderManualAddCard(lists, parts) {
            var hasManual = parts.some(function (p) { return p.kind === 'manual'; });
            var el = document.getElementById('manualAddCard');
            if (hasManual) { if (el) el.remove(); return; }
            if (el) return;
            var card = document.createElement('div');
            card.id = 'manualAddCard';
            card.className = 'bg-gray-900/30 border border-dashed border-gray-700 rounded-xl p-4 text-center';
            card.innerHTML = (
                '<p class="text-xs text-gray-500 mb-2">این منبع هنوز بخش «کانفیگ‌های دستی» ندارد.</p>' +
                '<div class="flex gap-2">' +
                    '<input type="text" id="newConfig-manual-new" class="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs font-mono" dir="ltr" placeholder="vless://...">' +
                    '<button class="add-config-btn bg-purple-600 hover:bg-purple-500 px-4 rounded-lg text-sm font-bold text-white" data-part="manual-new">افزودن</button>' +
                '</div>'
            );
            document.getElementById('editorPartsContainer').appendChild(card);
        }

        // Pushes any name overrides the user typed for configs in this part
        // (see pendingNameEdits) before/alongside the part's own settings.
        // A blank edit clears the config's custom name back to the default.
        function flushPendingNameEditsForPart(partId) {
            var partCard = document.querySelector('[data-part-card="' + partId + '"]');
            if (!partCard) return Promise.resolve();
            var wraps = Array.prototype.slice.call(partCard.querySelectorAll('.cfg-name-wrap'));
            var jobs = [];
            wraps.forEach(function (wrap) {
                var configId = wrap.getAttribute('data-id');
                if (!pendingNameEdits.hasOwnProperty(configId)) return;
                var newName = pendingNameEdits[configId];
                jobs.push(jsonFetch('/api/sources/' + editorSourceId + '/parts/' + partId + '/configs/' + configId + '/name', {
                    method: 'PUT',
                    body: JSON.stringify({ name: newName })
                }));
                delete pendingNameEdits[configId];
            });
            return Promise.all(jobs);
        }

        function savePartSettings(partId) {
            if (!editorSourceId) return;
            var catInd = document.getElementById('catInd-' + partId);
            var category = (catInd && catInd.checked) ? 'independent' : 'cloudflare';
            var useCleanIp = document.getElementById('useCleanIp-' + partId).checked;
            var matchRangesEl = document.getElementById('matchRanges-' + partId);
            var matchKnownRangesOnly = matchRangesEl ? matchRangesEl.checked : true;
            var distRand = document.getElementById('distRand-' + partId);
            var distribution = (distRand && distRand.checked) ? 'random' : 'multiply';
            var cleanIpListId = document.getElementById('listId-' + partId).value;
            var oneConfigPerPort = document.getElementById('oneConfigPerPort-' + partId).checked;
            var selectedPorts = Array.prototype.slice.call(document.querySelectorAll('.port-cb-' + partId + ':checked')).map(function (cb) { return cb.value; });
            var payload = { category: category, useCleanIp: useCleanIp, matchKnownRangesOnly: matchKnownRangesOnly, distribution: distribution, cleanIpListId: cleanIpListId, oneConfigPerPort: oneConfigPerPort, selectedPorts: selectedPorts };

            var uploadBoostEl = document.getElementById('uploadBoost-' + partId);
            if (uploadBoostEl) {
                payload.uploadBoostEnabled = uploadBoostEl.checked;
                var fpEl = document.getElementById('uploadBoostFp-' + partId);
                if (fpEl) payload.uploadBoostFingerprint = fpEl.value;
                var csEl = document.getElementById('uploadBoostCs-' + partId);
                if (csEl) payload.uploadBoostCipherSuites = csEl.value.trim();
                var fmEl = document.getElementById('uploadBoostFm-' + partId);
                if (fmEl) payload.uploadBoostFragmentMask = fmEl.value.trim();
            }

            // Auto-refresh is per-part and only meaningful for a url part -
            // it rides along with this same "save" action rather than having
            // its own separate save button (there's nothing to save on its
            // own; it's just two more fields on this part's settings).
            var autoRefreshEl = document.getElementById('autoRefresh-' + partId);
            if (autoRefreshEl) {
                var minutesEl = document.getElementById('autoRefreshMinutes-' + partId);
                var minutes = parseInt(minutesEl.value, 10);
                if (!minutes || minutes < 15) { showToast('حداقل فاصله‌ی به‌روزرسانی ۱۵ دقیقه است', 'error'); return; }
                payload.autoRefreshEnabled = autoRefreshEl.checked;
                payload.autoRefreshMinutes = minutes;
            }

            var batchPayload = computePartBatchPayload(partId);
            var batchTouched = batchPayload.deletedConfigIds.length > 0 || pendingOrder.hasOwnProperty(partId) ||
                Object.keys(pendingIncluded).some(function (id) { return isConfigIdInPart(partId, id); });

            Promise.all([
                flushPendingNameEditsForPart(partId),
                batchTouched ? jsonFetch('/api/sources/' + editorSourceId + '/parts/' + partId + '/configs/batch', {
                    method: 'PUT',
                    body: JSON.stringify(batchPayload)
                }) : Promise.resolve({ ok: true, result: { success: true } })
            ]).then(function (results) {
                var batchResult = results[1];
                if (!(batchResult.ok && batchResult.result.success)) {
                    showToast(translateApiError(batchResult.result, 'ذخیره تغییرات ناموفق بود'), 'error');
                    return Promise.reject(new Error('batch-failed'));
                }
                if (batchResult.result.capped) showToast('برخی کانفیگ‌ها به سقف تعداد بلاک رسیدند و اعمال نشدند', 'error');
                return jsonFetch('/api/sources/' + editorSourceId + '/parts/' + partId, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            }).then(function (r) {
                if (!r) return;
                if (r.ok && r.result.success) {
                    showToast('تنظیمات این بخش ذخیره شد');
                    clearPendingConfigStateForPart(partId);
                } else {
                    showToast(translateApiError(r.result, 'ذخیره ناموفق بود'), 'error');
                }
                loadData();
                refreshConfigEditor();
            }).catch(function (e) {
                if (e && e.message === 'batch-failed') return;
                showToast('خطای شبکه', 'error');
            });
        }

        // Turns the locally-staged delete/reorder/include-exclude state for
        // one part into the payload the batch endpoint expects. Deleted
        // configs are dropped from both the order and the blocked list -
        // there is nothing left to block once a config is gone.
        function computePartBatchPayload(partId) {
            var baseline = (editorPartsCache[partId] && editorPartsCache[partId].configs) || [];
            var order = pendingOrder[partId] || baseline.map(function (c) { return c.configId; });
            var deleted = [];
            var blocked = [];
            var finalOrder = [];
            order.forEach(function (id) {
                if (pendingDeletes[id]) { deleted.push(id); return; }
                finalOrder.push(id);
                var baseCfg = baseline.filter(function (c) { return c.configId === id; })[0];
                var included = pendingIncluded.hasOwnProperty(id) ? pendingIncluded[id] : (baseCfg ? !baseCfg.blocked : true);
                if (!included) blocked.push(id);
            });
            return { order: finalOrder, deletedConfigIds: deleted, blockedConfigIds: blocked };
        }

        function isConfigIdInPart(partId, configId) {
            var baseline = (editorPartsCache[partId] && editorPartsCache[partId].configs) || [];
            return baseline.some(function (c) { return c.configId === configId; });
        }

        function clearPendingConfigStateForPart(partId) {
            var baseline = (editorPartsCache[partId] && editorPartsCache[partId].configs) || [];
            baseline.forEach(function (c) {
                delete pendingDeletes[c.configId];
                delete pendingIncluded[c.configId];
            });
            delete pendingOrder[partId];
        }

        // Turns just the name part of the row into an editable text field -
        // the host hint stays visible next to it. Nothing is sent to the
        // server yet: the typed value only lives in pendingNameEdits (see
        // savePartSettings/flushPendingNameEditsForPart) until the user
        // presses this part's "save" button, or is discarded if they click
        // away without saving (see the focusout handler below).
        function startEditConfigName(wrap) {
            if (wrap.querySelector('input')) return; // already editing
            var configId = wrap.getAttribute('data-id');
            var defaultName = wrap.getAttribute('data-default-name') || 'AutoSub';
            var savedCustom = wrap.getAttribute('data-saved-custom') || '';
            var current = pendingNameEdits.hasOwnProperty(configId) ? (pendingNameEdits[configId] || defaultName) : (savedCustom || defaultName);
            var nameSpan = wrap.querySelector('.cfg-name-display');
            if (!nameSpan) return;
            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'cfg-name-input min-w-0 flex-1 bg-gray-950 border border-indigo-500/50 rounded px-1.5 py-0.5 text-xs text-gray-100 focus:outline-none';
            input.dir = 'ltr';
            input.maxLength = 60;
            input.value = current;
            nameSpan.replaceWith(input);
            input.focus();
            input.select();
        }

        // pendingNameEdits[configId] holds one of three things once the user
        // has interacted with a name field:
        //   - absent entirely: no change from whatever's already saved
        //   - '' (empty string): an EXPLICIT clear back to the default name,
        //     which still needs to reach the server to delete cfg.customName
        //   - a non-empty string: the new custom name to save
        // This distinction matters because "the field currently shows the
        // default name" and "nothing needs to be sent on save" are not the
        // same thing whenever a custom name was saved before this edit.
        function commitConfigNameEdit(wrap, input) {
            var configId = wrap.getAttribute('data-id');
            var defaultName = wrap.getAttribute('data-default-name') || 'AutoSub';
            var savedCustom = wrap.getAttribute('data-saved-custom') || '';
            var typed = input.value.trim();
            if (typed === savedCustom) {
                delete pendingNameEdits[configId]; // matches what's already saved server-side - nothing to do
            } else if (!typed || typed === defaultName) {
                pendingNameEdits[configId] = ''; // explicit revert-to-default; must still be sent if a custom name was saved before
            } else {
                pendingNameEdits[configId] = typed;
            }
            renderConfigNameWrap(wrap);
        }

        function renderConfigNameWrap(wrap) {
            var configId = wrap.getAttribute('data-id');
            var defaultName = wrap.getAttribute('data-default-name') || 'AutoSub';
            var savedCustom = wrap.getAttribute('data-saved-custom') || '';
            var host = wrap.getAttribute('data-host') || '';
            var shown = pendingNameEdits.hasOwnProperty(configId) ? (pendingNameEdits[configId] || defaultName) : (savedCustom || defaultName);
            var nameSpan = document.createElement('span');
            nameSpan.className = 'cfg-name-display flex-1 min-w-0 truncate text-xs text-gray-300 cursor-text hover:text-white transition';
            nameSpan.title = 'برای تغییر نام این کانفیگ کلیک کنید';
            nameSpan.textContent = shown;
            var hostSpan = document.createElement('span');
            hostSpan.className = 'max-w-[45%] min-w-0 shrink truncate text-[11px] text-gray-600';
            hostSpan.title = host;
            hostSpan.textContent = '(' + host + ')';
            wrap.innerHTML = '';
            wrap.appendChild(nameSpan);
            wrap.appendChild(hostSpan);
        }

        function addConfigToPart(partId) {
            if (!editorSourceId) return;
            var input = document.getElementById('newConfig-' + partId);
            var raw = input.value.trim();
            if (!raw) { showToast('یک کانفیگ وارد کنید', 'error'); return; }
            jsonFetch('/api/sources/' + editorSourceId + '/parts/' + partId + '/configs', { method: 'POST', body: JSON.stringify({ raw: raw }) }).then(function (r) {
                if (r.ok && r.result.success) { input.value = ''; showToast('کانفیگ اضافه شد'); loadData(); refreshConfigEditor(); }
                else showToast(translateApiError(r.result, 'افزودن ناموفق بود'), 'error');
            }).catch(function () { showToast('خطای شبکه', 'error'); });
        }

        // Re-renders one part's whole card from editorPartsCache plus
        // whatever's currently staged (pendingDeletes/pendingIncluded/
        // pendingOrder/pendingNameEdits). Used after every local staging
        // action instead of a server round-trip, since nothing is actually
        // sent until this part's own "save" button is pressed.
        function rerenderPartCardInPlace(partId) {
            var part = editorPartsCache[partId];
            var cardEl = document.querySelector('[data-part-card="' + partId + '"]');
            if (!part || !cardEl) return;
            var idx = editorPartsOrder.indexOf(partId);
            var tmp = document.createElement('div');
            tmp.innerHTML = renderPartCard(part, editorListsCache, idx);
            var newCard = tmp.firstElementChild;
            cardEl.replaceWith(newCard);
            var portsContainer = document.getElementById('ports-' + partId);
            if (portsContainer) renderPortCheckboxesInto(portsContainer, part.availablePorts, part.selectedPorts, 'port-cb-' + partId);
            var selCb = newCard.querySelector('.select-all-cb[data-indeterminate]');
            if (selCb) selCb.indeterminate = true;
        }

        // Toggles a config between "marked for deletion" and normal - purely
        // local. The row is dimmed/struck-through with an undo button in
        // place of the trash icon; nothing reaches the server until this
        // part's "save" button is pressed (see savePartSettings).
        function toggleDeletePending(partId, configId) {
            pendingDeletes[configId] = !pendingDeletes[configId];
            rerenderPartCardInPlace(partId);
        }

        // Stages a single row's include/exclude state - purely local.
        function stageConfigIncluded(partId, configId, wantIncluded) {
            pendingIncluded[configId] = wantIncluded;
            rerenderPartCardInPlace(partId);
        }

        // Stages every non-deleted config in this part as included/excluded
        // at once - purely local, same as the per-row version above.
        function stageAllConfigsIncluded(partId, selected) {
            var part = editorPartsCache[partId];
            if (!part) return;
            orderedConfigsForPart(part).forEach(function (c) {
                if (pendingDeletes[c.configId]) return;
                pendingIncluded[c.configId] = selected;
            });
            rerenderPartCardInPlace(partId);
        }

        function deletePart(partId) {
            if (!editorSourceId) return;
            if (!confirm('این بخش به‌طور کامل حذف شود؟ این کار قابل بازگشت نیست.')) return;
            jsonFetch('/api/sources/' + editorSourceId + '/parts/' + partId, { method: 'DELETE' }).then(function (r) {
                if (r.ok && r.result.success) {
                    showToast('بخش حذف شد');
                    clearPendingConfigStateForPart(partId);
                    loadData();
                    refreshConfigEditor();
                } else {
                    showToast(translateApiError(r.result, 'حذف این بخش ناموفق بود'), 'error');
                }
            }).catch(function () { showToast('خطای شبکه', 'error'); });
        }

        document.getElementById('editorPartsContainer').addEventListener('click', function (e) {
            var saveBtn = e.target.closest('.save-part-btn');
            if (saveBtn) { savePartSettings(saveBtn.getAttribute('data-part')); return; }
            var resetBoostBtn = e.target.closest('.reset-upload-boost-btn');
            if (resetBoostBtn) { resetUploadBoostDefaults(resetBoostBtn.getAttribute('data-part')); return; }
            var addBtn = e.target.closest('.add-config-btn');
            if (addBtn) { addConfigToPart(addBtn.getAttribute('data-part')); return; }
            var deletePartBtn = e.target.closest('.delete-part-btn');
            if (deletePartBtn) { deletePart(deletePartBtn.getAttribute('data-part')); return; }
            var delBtn = e.target.closest('.delete-config-btn');
            if (delBtn) { toggleDeletePending(delBtn.getAttribute('data-part'), delBtn.getAttribute('data-id')); return; }
            var undoBtn = e.target.closest('.undo-delete-config-btn');
            if (undoBtn) { toggleDeletePending(undoBtn.getAttribute('data-part'), undoBtn.getAttribute('data-id')); return; }
            var nameWrap = e.target.closest('.cfg-name-wrap');
            if (nameWrap && !nameWrap.querySelector('input')) { startEditConfigName(nameWrap); return; }
        });

        document.getElementById('editorPartsContainer').addEventListener('change', function (e) {
            var includeCb = e.target.closest('.config-include-cb');
            if (includeCb) { stageConfigIncluded(includeCb.getAttribute('data-part'), includeCb.getAttribute('data-id'), includeCb.checked); return; }
            var selectAllCb = e.target.closest('.select-all-cb');
            if (selectAllCb) { stageAllConfigsIncluded(selectAllCb.getAttribute('data-part'), selectAllCb.checked); return; }
            var catRadio = e.target.closest('input[type="radio"][name^="cat-"]');
            if (catRadio) {
                var partId = catRadio.name.slice(4);
                var wrap = document.getElementById('rangeOnlyWrap-' + partId);
                if (wrap) wrap.classList.toggle('hidden', catRadio.value !== 'independent');
                return;
            }
        });

        // Press-and-drag reordering via a dedicated handle (see
        // renderConfigRow's drag-handle-btn) - replaces the old ▲▼ buttons.
        // Pointer Events unify mouse and touch; setPointerCapture keeps every
        // subsequent move/up event targeted at the dragged row (which still
        // bubbles up to these delegated listeners) even if the pointer
        // strays outside it mid-drag. The reorder itself is purely visual
        // (DOM-only) until the drop, at which point the resulting DOM order
        // is captured into pendingOrder and nothing is sent to the server
        // until this part's "save" button is pressed.
        var dragState = null;

        document.getElementById('editorPartsContainer').addEventListener('pointerdown', function (e) {
            var handle = e.target.closest('.drag-handle-btn');
            if (!handle) return;
            var row = handle.closest('[data-config-id]');
            var partCard = handle.closest('[data-part-card]');
            if (!row || !partCard) return;
            e.preventDefault();
            dragState = { partId: partCard.getAttribute('data-part-card'), row: row, pointerId: e.pointerId };
            try { row.setPointerCapture(e.pointerId); } catch (err) { /* unsupported - drag just won't track outside the row */ }
            row.classList.add('ring-2', 'ring-indigo-500');
        });

        document.getElementById('editorPartsContainer').addEventListener('pointermove', function (e) {
            if (!dragState || dragState.pointerId !== e.pointerId) return;
            var row = dragState.row;
            var container = row.parentElement;
            if (!container) return;
            var siblings = Array.prototype.slice.call(container.children).filter(function (el) { return el !== row; });
            for (var i = 0; i < siblings.length; i++) {
                var rect = siblings[i].getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) {
                    container.insertBefore(row, siblings[i]);
                    return;
                }
            }
            container.appendChild(row);
        });

        function finishDrag(e) {
            if (!dragState || dragState.pointerId !== e.pointerId) return;
            var row = dragState.row;
            var partId = dragState.partId;
            row.classList.remove('ring-2', 'ring-indigo-500');
            try { row.releasePointerCapture(dragState.pointerId); } catch (err) { /* already released */ }
            var container = row.parentElement;
            if (container) {
                pendingOrder[partId] = Array.prototype.slice.call(container.children).map(function (el) { return el.getAttribute('data-config-id'); });
            }
            dragState = null;
        }
        document.getElementById('editorPartsContainer').addEventListener('pointerup', finishDrag);
        document.getElementById('editorPartsContainer').addEventListener('pointercancel', finishDrag);

        // focusout bubbles (unlike blur), so this one delegated listener
        // catches "clicked away" for every open name-edit field at once.
        document.getElementById('editorPartsContainer').addEventListener('focusout', function (e) {
            var input = e.target.closest('.cfg-name-input');
            if (!input) return;
            var wrap = input.closest('.cfg-name-wrap');
            if (wrap) commitConfigNameEdit(wrap, input);
        });

        document.getElementById('editorPartsContainer').addEventListener('keydown', function (e) {
            var input = e.target.closest('.cfg-name-input');
            if (!input) return;
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            else if (e.key === 'Escape') {
                e.preventDefault();
                var wrap = input.closest('.cfg-name-wrap');
                if (wrap) renderConfigNameWrap(wrap); // discard the keystroke, keep whatever was pending before
            }
        });

        document.addEventListener('DOMContentLoaded', loadData);
    </script>
</body>
</html>`;
}
