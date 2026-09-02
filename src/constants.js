export const BUILTIN_CLEAN_IP_LIST_ID = "default";

export const DEFAULT_CLEAN_IPS = [
  "104.26.3.241",
  "104.24.240.191",
  "104.21.124.144",
  "104.18.149.104",
  "172.67.240.13",
  "104.18.131.149",
  "172.66.41.171",
  "162.159.149.6",
  "104.20.39.38",
  "108.162.196.8",
  "104.19.112.223",
  "104.17.207.125",
  "104.25.6.188",
  "104.16.81.97",
  "104.27.78.209"
];

export const CLOUDFLARE_IP_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32"
];

export const KNOWN_NOISE_KEYS = new Set([
  "junk", "rnd", "random", "nonce", "seed", "salt",
  "ts", "timestamp", "cache", "cachebuster", "v", "_"
]);

export const MAX_URLS_PER_SOURCE = 10;
export const MAX_MANUAL_LINES_PER_ADD = 500;
export const MAX_BASE_CONFIGS_PER_PART = 1000;
export const MAX_BLOCKED_PER_PART = 300;
export const MAX_CUSTOM_NAMES_PER_PART = 300;
export const MAX_CUSTOM_NAME_LENGTH = 60;
export const MAX_CLEAN_IPS_PER_LIST = 300;
export const MAX_CLEAN_IP_LISTS = 30;
export const MAX_FINAL_CONFIGS_PER_PART = 6000;

// --- Upload boost (TLS fingerprint / cipher suite / fragment spoofing) ---
// v1.1.0 data model: each of the three layers (fp/cs/fm) is either an empty
// string (disabled - nothing is injected for that layer) or a concrete
// value/preset-name/"random" to inject. Master `uploadBoostEnabled` still
// gates the whole feature so it can be toggled without clearing the fields.
// Defaults and presets below match Patterniha's own values exactly (the
// method this feature is based on - see https://github.com/patterniha),
// not arbitrary substitutes.
export const DEFAULT_UPLOAD_BOOST_FINGERPRINT = "unsafe";

// Fingerprint values v2rayNG/utls actually support. "unsafe" is Patterniha's
// own default. "none" means the fp param is simply not sent (equivalent to
// leaving the field empty/off, but listed here since it is itself a
// meaningful, explicit choice distinct from "off the whole feature").
export const UPLOAD_BOOST_FINGERPRINT_PRESETS = ["unsafe", "chrome", "firefox", "safari", "ios", "android", "edge", "none"];

// Pool used when "random" is selected: re-resolved every time a
// subscription's output is (re)generated (see configEngine/output.js), not
// once at save time - so the fingerprint actually rotates on every sync.
// "none" is intentionally excluded: picking "no fingerprint" at random would
// partially defeat the point of asking for a randomized one.
export const UPLOAD_BOOST_FINGERPRINT_RANDOM_POOL = ["unsafe", "chrome", "firefox", "safari", "ios", "android", "edge"];

// Named cipher-suite profiles. "patternia" is Patterniha's own tested
// default; the rest are real browser JA3-derived orderings offered as
// additional named choices. Keys double as the dropdown's option values.
export const UPLOAD_BOOST_CIPHER_SUITES_PRESETS = {
  patternia: "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256",
  chrome_mobile: "TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
  firefox: "TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_CBC_SHA",
  chrome_desktop: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_CBC_SHA",
  safari: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA",
  tls13_only: "TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256",
  mixed: "TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA"
};
export const DEFAULT_UPLOAD_BOOST_CIPHER_SUITES = UPLOAD_BOOST_CIPHER_SUITES_PRESETS.patternia;
// Re-resolved on every output generation, same as fingerprint - picks
// among all 7 named profiles above, uniformly.
export const UPLOAD_BOOST_CIPHER_SUITES_RANDOM_POOL = Object.values(UPLOAD_BOOST_CIPHER_SUITES_PRESETS);

// Named fragment-mask profiles. "patternia" is Patterniha's own tested
// default; the other three are hand-tuned alternatives (more aggressive,
// balanced, or faster splitting).
export const UPLOAD_BOOST_FRAGMENT_MASK_PRESETS = {
  patternia: '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["5","94","1"],"delays":["0"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["109","1"],"delays":["1"],"maxSplit":"355"}}]}',
  aggressive: '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["1","50","2"],"delays":["1"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["40","1"],"delays":["2"],"maxSplit":"500"}}]}',
  balanced: '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["3","120","2"],"delays":["0"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["80","2"],"delays":["1"],"maxSplit":"300"}}]}',
  fast: '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["8","180","3"],"delays":["0"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["150","2"],"delays":["0"],"maxSplit":"200"}}]}'
};
export const DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK = UPLOAD_BOOST_FRAGMENT_MASK_PRESETS.patternia;

// v1.1.0: unlike fp/cs (which pick among a fixed pool when randomized), "fm
// random" generates fresh numeric parameters within these vetted ranges
// every time (see configEngine/part.js resolveUploadBoostFieldForGeneration) -
// getting fragmentation parameters wrong can make a config unusable, so
// these bounds are deliberately conservative rather than wide-open.
export const UPLOAD_BOOST_FRAGMENT_RANDOM_RANGES = {
  firstChunkLen: [1, 15], // first tlshello chunk: kept small to break the pattern at the very start
  bodyChunkLen: [40, 200], // main body of the handshake
  lastChunkLen: [1, 15], // final chunk of the tlshello block, kept small
  firstDelayMs: [0, 3],
  secondBlockLen1: [40, 200],
  secondBlockLen2: [1, 15],
  secondDelayMs: [0, 2],
  maxSplit: [100, 500]
};

// Which protocols a part's upload-boost settings apply to. Both are on by
// default (matches 1.0.0 behavior); a user can now restrict it to just one.
export const DEFAULT_UPLOAD_BOOST_PROTOCOLS = ["vless", "trojan"];

// A starter set of cloud regions matching the "placement hint" trick
// circulating in the community, spanning several continents (not just the
// Middle East) - the field always accepts free-text "provider:region" too,
// since Cloudflare supports far more regions than any short list can cover.
export const PLACEMENT_REGION_PRESETS = [
  { value: "azure:israelcentral", label: "Azure - Israel Central" },
  { value: "gcp:me-west1", label: "GCP - Tel Aviv (me-west1)" },
  { value: "aws:me-south1", label: "AWS - Bahrain (me-south1)" },
  { value: "azure:uaenorth", label: "Azure - UAE North" },
  { value: "aws:eu-central-1", label: "AWS - Frankfurt (eu-central-1)" },
  { value: "gcp:europe-west1", label: "GCP - Belgium (europe-west1)" },
  { value: "azure:westeurope", label: "Azure - West Europe" },
  { value: "aws:us-east-1", label: "AWS - N. Virginia (us-east-1)" },
  { value: "aws:us-west-1", label: "AWS - N. California (us-west-1)" },
  { value: "gcp:us-central1", label: "GCP - Iowa (us-central1)" },
  { value: "azure:eastus", label: "Azure - East US" },
  { value: "aws:ap-southeast-1", label: "AWS - Singapore (ap-southeast-1)" },
  { value: "gcp:asia-east1", label: "GCP - Taiwan (asia-east1)" },
  { value: "azure:southeastasia", label: "Azure - Southeast Asia" },
  { value: "aws:ap-northeast-1", label: "AWS - Tokyo (ap-northeast-1)" },
  { value: "gcp:australia-southeast1", label: "GCP - Sydney (australia-southeast1)" }
];

export const SUBSCRIPTION_FETCH_TIMEOUT_MS = 15 * 1000;

export const DEFAULT_AUTO_REFRESH_MINUTES = 24 * 60;
export const MIN_AUTO_REFRESH_MINUTES = 15;
export const MAX_AUTO_REFRESH_MINUTES = 30 * 24 * 60;

export const BACKUP_FORMAT_VERSION = 1;

export const LOGIN_COOLDOWN_STEP_SECONDS = 2;
export const LOGIN_COOLDOWN_CAP_SECONDS = 30;
export const LOGIN_FAIL_RECORD_TTL_SECONDS = 20 * 60;

export const SESSION_TTL_SECONDS = 864000;

export const PANEL_PATH = "/app";

export const SLUG_MIN_LENGTH = 4;
export const SLUG_MAX_LENGTH = 32;
export const SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;

// --- Config naming mode (v1.1.0) ---
// "auto"     -> panel generates sequential names ("SourceName 1", "2", ...)
// "original" -> keep each config's own embedded name (URI #fragment / vmess ps)
export const NAME_MODE_AUTO = "auto";
export const NAME_MODE_ORIGINAL = "original";
export const DEFAULT_NAME_MODE_URL = NAME_MODE_AUTO;
export const DEFAULT_NAME_MODE_MANUAL = NAME_MODE_ORIGINAL;
export const FALLBACK_CONFIG_NAME = "AutoSub";

// --- Per-config live usage-percentage sentinel (v1.1.0) ---
// Placed inside a cached config's display name at generation time, then
// substituted with a live-fetched percentage at serve time (see
// publicApi/serveSubscription.js). Deliberately alphanumeric-only: the
// display name is run through encodeURIComponent (for uri-kind configs) or
// embedded in base64 (for vmess), and only an unreserved-charset token is
// guaranteed to survive encodeURIComponent completely unchanged so a plain
// string substitution on the cached output still finds it byte-for-byte.
// NOTE: this only works for uri-kind configs (VLESS/Trojan/Shadowsocks).
// VMess-legacy configs are base64-encoded as a *whole* at generation time
// (see configEngine/output.js), so a value only known at serve time can
// never be spliced back in after the fact - usage-percent display is
// therefore skipped for vmess configs (see buildDisplayName).
export const USAGE_PERCENT_SENTINEL = "SmUsagePct7f2b9c";

// How long a live-fetched usage percentage may be reused for further
// /sub/{slug} requests before being re-fetched from Cloudflare's GraphQL
// analytics API. This ONLY affects the public client-facing subscription
// path - it is never consulted by the admin panel's own manual/auto sync
// (see sync/syncEngine.js, api/partsApi.js), which always reflect the
// panel's own actions immediately.
//
// This is Cloudflare KV's own documented minimum TTL
// (https://developers.cloudflare.com/kv/api/write-key-value-pairs/) - a
// lower value makes the KV write throw on every request. A shorter,
// Worker-isolate-local (in-memory) cache was considered too, but dropped:
// since isolates are not shared across requests/locations, it cannot
// actually guarantee a tighter bound in the worst case (a request landing
// on a different isolate each time gets no benefit from it at all) - it
// would only add complexity without a reliable improvement. KV, though
// slower, is shared globally and gives a real, consistent 60s cap on how
// often Cloudflare's GraphQL API gets called for a given worker script.
export const USAGE_PERCENT_CACHE_SECONDS = 60;

// Same free-plan daily invocation cap used by the existing account-wide
// "worker usage" widget, reused as the denominator for the per-config
// percentage so the two numbers stay consistent with each other.
export const WORKER_FREE_DAILY_LIMIT = 100000;
