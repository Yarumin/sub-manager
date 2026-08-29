import { shortId } from "../utils/ids.js";
import {
  BUILTIN_CLEAN_IP_LIST_ID,
  DEFAULT_UPLOAD_BOOST_FINGERPRINT,
  DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
  DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
  DEFAULT_AUTO_REFRESH_MINUTES,
  MAX_BASE_CONFIGS_PER_PART
} from "../constants.js";

export function makeNewPart(kind, url, category) {
  const cat = category === "independent" ? "independent" : "cloudflare";
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
    baseConfigs: [],
    blockedFingerprints: [],
    customNamesByFingerprint: {},
    uploadBoostEnabled: false,
    uploadBoostFingerprint: DEFAULT_UPLOAD_BOOST_FINGERPRINT,
    uploadBoostCipherSuites: DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
    uploadBoostFragmentMask: DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
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
    (part.baseConfigs || []).forEach((cfg) => {
      cfg.name = (source.name || "AutoSub") + " " + n;
      n++;
    });
  });
}

export function isConfigBlocked(part, cfg) {
  return (part.blockedFingerprints || []).includes(cfg.fingerprint);
}

export function resyncPart(part, extractedConfigs) {
  part.blockedFingerprints = part.blockedFingerprints || [];
  part.customNamesByFingerprint = part.customNamesByFingerprint || {};
  populatePartConfigs(part, extractedConfigs);
}
