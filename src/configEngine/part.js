import { shortId } from "../utils/ids.js";
import {
  BUILTIN_CLEAN_IP_LIST_ID,
  DEFAULT_UPLOAD_BOOST_FINGERPRINT,
  DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
  DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
  DEFAULT_UPLOAD_BOOST_PROTOCOLS,
  DEFAULT_AUTO_REFRESH_MINUTES,
  DEFAULT_NAME_MODE_URL,
  DEFAULT_NAME_MODE_MANUAL,
  NAME_MODE_ORIGINAL,
  FALLBACK_CONFIG_NAME,
  MAX_BASE_CONFIGS_PER_PART,
  UPLOAD_BOOST_FINGERPRINT_RANDOM_POOL,
  UPLOAD_BOOST_CIPHER_SUITES_RANDOM_POOL,
  UPLOAD_BOOST_FRAGMENT_RANDOM_RANGES
} from "../constants.js";

function randomInt(range) {
  const [min, max] = range;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generates a fresh fragment-mask JSON string within the vetted ranges
// documented for this feature - not a pick from a small fixed list like fp
// and cs, since fragmentation parameters are numeric and the useful space
// is a range, not a handful of named presets.
function generateRandomFragmentMask() {
  const r = UPLOAD_BOOST_FRAGMENT_RANDOM_RANGES;
  const x = randomInt(r.firstChunkLen);
  const y = randomInt(r.bodyChunkLen);
  const z = randomInt(r.lastChunkLen);
  const d1 = randomInt(r.firstDelayMs);
  const a = randomInt(r.secondBlockLen1);
  const b = randomInt(r.secondBlockLen2);
  const d2 = randomInt(r.secondDelayMs);
  const maxSplit = randomInt(r.maxSplit);
  return JSON.stringify({
    tcp: [
      { type: "fragment", settings: { packets: "tlshello", lengths: [String(x), String(y), String(z)], delays: [String(d1)], maxSplit: "0" } },
      { type: "fragment", settings: { packets: "1-1", lengths: [String(a), String(b)], delays: [String(d2)], maxSplit: String(maxSplit) } }
    ]
  });
}

export function makeNewPart(kind, url, category, nameMode) {
  const cat = category === "independent" ? "independent" : "cloudflare";
  const defaultNameMode = kind === "manual" ? DEFAULT_NAME_MODE_MANUAL : DEFAULT_NAME_MODE_URL;
  const part = {
    id: shortId(),
    kind,
    url: kind === "url" ? url : null,
    category: cat,
    useCleanIp: cat === "cloudflare",
    cleanIpListId: BUILTIN_CLEAN_IP_LIST_ID,
    distribution: "multiply",
    selectedPorts: [],
    oneConfigPerPort: cat === "cloudflare",
    matchKnownRangesOnly: true,
    // "auto" -> panel generates "SourceName N" sequential names.
    // "original" -> keep each config's own embedded name untouched.
    nameMode: nameMode === NAME_MODE_ORIGINAL || nameMode === "auto" ? nameMode : defaultNameMode,
    // Only relevant when nameMode is "auto": whether a running number is
    // appended after the source name ("SourceName 1", "2", ...) or every
    // config in this part just gets the plain source name. On by default.
    autoNumberEnabled: true,
    baseConfigs: [],
    blockedFingerprints: [],
    customNamesByFingerprint: {},
    uploadBoostEnabled: false,
    // v1.1.0: each of these three is either empty (disabled) or a value to
    // inject - there is no separate per-layer boolean anymore.
    uploadBoostFingerprint: DEFAULT_UPLOAD_BOOST_FINGERPRINT,
    uploadBoostCipherSuites: DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
    uploadBoostFragmentMask: DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
    uploadBoostProtocols: DEFAULT_UPLOAD_BOOST_PROTOCOLS.slice(),
    truncated: false,
    lastFetchOk: null,
    lastFetchedAt: null
  };
  if (kind === "url") {
    part.autoRefreshEnabled = true;
    part.autoRefreshMinutes = DEFAULT_AUTO_REFRESH_MINUTES;
  }
  return part;
}

export function populatePartConfigs(part, extractedConfigs) {
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
    if (customNames[cfg.fingerprint]) cfg.customName = customNames[cfg.fingerprint];
    part.baseConfigs.push(cfg);
    seenInBatch.add(cfg.fingerprint);
  }
}

export function assignSequentialNames(source) {
  let n = 1;
  (source.parts || []).forEach((part) => {
    const useOriginal = part.nameMode === NAME_MODE_ORIGINAL;
    const useNumbering = part.autoNumberEnabled !== false;
    (part.baseConfigs || []).forEach((cfg) => {
      if (useOriginal) {
        // Keep the config's own embedded name; only fall back to a
        // sequential name if it genuinely has none (e.g. no #fragment).
        cfg.name = cfg.originalName || (source.name || FALLBACK_CONFIG_NAME) + (useNumbering ? " " + n : "");
      } else {
        cfg.name = (source.name || FALLBACK_CONFIG_NAME) + (useNumbering ? " " + n : "");
      }
      n++;
    });
  });
}

export function isConfigBlocked(part, cfg) {
  return (part.blockedFingerprints || []).includes(cfg.fingerprint);
}

// v1.1.0: the literal string "random" is stored as-is in the part (not
// resolved at save time) and re-resolved to a fresh concrete value every
// time a subscription's output is (re)generated - see
// configEngine/output.js buildPartSettings, which calls this for each of
// the three fields on every generation pass. This means the actual
// fingerprint/cipher-list/fragment-mask genuinely rotates on every sync,
// not just once when the user saved the setting.
export function resolveUploadBoostFieldForGeneration(field, storedValue) {
  if ((storedValue || "").trim().toLowerCase() !== "random") return storedValue;
  if (field === "fingerprint") {
    return UPLOAD_BOOST_FINGERPRINT_RANDOM_POOL[Math.floor(Math.random() * UPLOAD_BOOST_FINGERPRINT_RANDOM_POOL.length)];
  }
  if (field === "cipherSuites") {
    return UPLOAD_BOOST_CIPHER_SUITES_RANDOM_POOL[Math.floor(Math.random() * UPLOAD_BOOST_CIPHER_SUITES_RANDOM_POOL.length)];
  }
  return generateRandomFragmentMask();
}

export function resyncPart(part, extractedConfigs) {
  part.blockedFingerprints = part.blockedFingerprints || [];
  part.customNamesByFingerprint = part.customNamesByFingerprint || {};
  populatePartConfigs(part, extractedConfigs);
}
