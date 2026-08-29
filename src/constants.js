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

export const DEFAULT_UPLOAD_BOOST_FINGERPRINT = "unsafe";
export const DEFAULT_UPLOAD_BOOST_CIPHER_SUITES = "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256";
export const DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK = '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["5","94","1"],"delays":["0"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["109","1"],"delays":["1"],"maxSplit":"355"}}]}';

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
