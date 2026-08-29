import {
  BUILTIN_CLEAN_IP_LIST_ID,
  DEFAULT_UPLOAD_BOOST_FINGERPRINT,
  DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
  DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
  MAX_FINAL_CONFIGS_PER_PART
} from "../constants.js";
import { normalizeHostForUrl } from "../utils/netutil.js";
import { isKnownCloudflareIp } from "../utils/cidr.js";
import { extractConfigPort, extractHostFromConfig, extractLogicalDestination } from "./parse.js";
import { isConfigBlocked } from "./part.js";

export function applyPortFilter(baseConfigs, selectedPorts) {
  const selected = Array.isArray(selectedPorts) ? selectedPorts.filter(Boolean) : [];
  if (selected.length === 0) return baseConfigs || [];
  const allow = new Set(selected);
  return (baseConfigs || []).filter((cfg) => allow.has(extractConfigPort(cfg)));
}

export function reduceToOnePerHostPort(baseConfigs, category) {
  const groups = new Map();
  (baseConfigs || []).forEach((cfg) => {
    const host = category === "cloudflare" ? extractLogicalDestination(cfg) : (extractHostFromConfig(cfg) || "").toLowerCase();
    const key = host + "|" + extractConfigPort(cfg);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(cfg);
  });
  const result = [];
  groups.forEach((group) => {
    result.push(group[Math.floor(Math.random() * group.length)]);
  });
  return result;
}

export const CLOUDFLARE_TLS_PORT_EMOJIS = { "443": "🔒", "2053": "🛡️", "2083": "💎", "2087": "🚀", "2096": "⚡", "8443": "⭐" };
export const CLOUDFLARE_NONTLS_PORT_EMOJIS = { "80": "🔓", "8080": "🌊", "8880": "🍃", "2052": "🌙", "2082": "🔥", "2086": "🦋", "2095": "🍀" };
export const INDEPENDENT_EMOJI = "🌐";
export const UNKNOWN_PORT_EMOJI = "🔹";

export function getConfigEmoji(base, category) {
  if (category === "independent") return INDEPENDENT_EMOJI;
  const port = extractConfigPort(base);
  if (base.isTls) return CLOUDFLARE_TLS_PORT_EMOJIS[port] || UNKNOWN_PORT_EMOJI;
  return CLOUDFLARE_NONTLS_PORT_EMOJIS[port] || UNKNOWN_PORT_EMOJI;
}

export function buildDisplayName(base, category) {
  return getConfigEmoji(base, category) + " " + (base.customName || base.name);
}

export function applyUploadBoost(configUri, partSettings) {
  if (!partSettings || !partSettings.uploadBoostEnabled) return configUri;
  try {
    const url = new URL(configUri);
    const protocol = url.protocol.replace(":", "");
    if (protocol !== "vless" && protocol !== "trojan") return configUri;
    const params = new URLSearchParams(url.search);
    const security = params.get("security");
    const isTlsLike = protocol === "trojan" || security === "tls" || security === "reality";
    if (!isTlsLike) return configUri;
    const fp = partSettings.uploadBoostFingerprint;
    if (fp && fp !== "none") params.set("fp", fp);
    if (security !== "reality") {
      const cs = partSettings.uploadBoostCipherSuites;
      if (cs) params.set("cs", cs);
      const fm = partSettings.uploadBoostFragmentMask;
      if (fm) params.set("fm", fm);
    }
    url.search = params.toString().replace(/\+/g, "%20");
    return url.toString();
  } catch (e) {
    return configUri;
  }
}

export function applyHostToConfig(base, rawIp, category, partSettings) {
  const ip = normalizeHostForUrl(rawIp);
  const displayName = buildDisplayName(base, category);
  if (base.kind === "vmess-legacy") {
    const originalAdd = base.obj.add || "";
    const newObj = Object.assign({}, base.obj, { add: rawIp.trim(), ps: displayName });
    if (base.isTls && !newObj.sni) newObj.sni = originalAdd;
    if (newObj.net === "ws" && !newObj.host) newObj.host = originalAdd;
    return "vmess://" + btoa(unescape(encodeURIComponent(JSON.stringify(newObj))));
  }
  const origUrl = new URL(base.uri);
  const params = new URLSearchParams(origUrl.search);
  const newUrl = new URL(base.uri);
  newUrl.hostname = ip;
  const security = params.get("security");
  const protocol = origUrl.protocol.replace(":", "");
  const needsSni = protocol === "trojan" || security === "tls" || security === "reality";
  if (!params.has("sni") && needsSni) params.set("sni", origUrl.hostname.replace(/^\[/, "").replace(/\]$/, ""));
  if (!params.has("host") && params.get("type") === "ws") params.set("host", origUrl.hostname);
  newUrl.search = params.toString();
  newUrl.hash = encodeURIComponent(displayName);
  return applyUploadBoost(newUrl.toString(), partSettings);
}

export function passThroughConfig(base, category, partSettings) {
  const displayName = buildDisplayName(base, category);
  if (base.kind === "vmess-legacy") {
    const newObj = Object.assign({}, base.obj, { ps: displayName });
    return "vmess://" + btoa(unescape(encodeURIComponent(JSON.stringify(newObj))));
  }
  const newUrl = new URL(base.uri);
  const params = new URLSearchParams(newUrl.search);
  newUrl.search = params.toString();
  newUrl.hash = encodeURIComponent(displayName);
  return applyUploadBoost(newUrl.toString(), partSettings);
}

export function buildOriginalConfigs(baseConfigs, category, partSettings) {
  const out = [];
  (baseConfigs || []).forEach((base) => {
    try {
      out.push(passThroughConfig(base, category, partSettings));
    } catch (e) {
      /* skip this single malformed config, keep the rest of the output */
    }
  });
  return out;
}

export function splitByKnownRanges(baseConfigs) {
  const inRange = [];
  const outOfRange = [];
  (baseConfigs || []).forEach((cfg) => {
    const host = extractHostFromConfig(cfg);
    if (host && isKnownCloudflareIp(host)) inRange.push(cfg);
    else outOfRange.push(cfg);
  });
  return { inRange, outOfRange };
}

export function applyCleanIpToConfigs(baseConfigs, cleanIps, distribution, category, partSettings) {
  const safeIps = (Array.isArray(cleanIps) ? cleanIps : []).filter(Boolean);
  const out = [];
  if (safeIps.length === 0) return out;
  (baseConfigs || []).forEach((base) => {
    try {
      if (distribution === "random") {
        const ip = safeIps[Math.floor(Math.random() * safeIps.length)];
        out.push(applyHostToConfig(base, ip, category, partSettings));
      } else {
        safeIps.forEach((ip) => out.push(applyHostToConfig(base, ip, category, partSettings)));
      }
    } catch (e) {
      /* skip this single malformed config, keep the rest of the output */
    }
  });
  return out;
}

export function findCleanIpList(settings, listId) {
  return (
    settings.cleanIpLists.find((l) => l.id === listId) ||
    settings.cleanIpLists.find((l) => l.id === BUILTIN_CLEAN_IP_LIST_ID) ||
    settings.cleanIpLists[0]
  );
}

export function buildPartSettings(part) {
  return {
    uploadBoostEnabled: !!part.uploadBoostEnabled,
    uploadBoostFingerprint: part.uploadBoostFingerprint || DEFAULT_UPLOAD_BOOST_FINGERPRINT,
    uploadBoostCipherSuites: part.uploadBoostCipherSuites || DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
    uploadBoostFragmentMask: part.uploadBoostFragmentMask || DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK
  };
}

export function randomSampleCapped(arr, capCount) {
  if (!arr || arr.length <= capCount) return arr || [];
  const pool = arr.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, Math.max(0, capCount));
}

export function generatePartOutput(part, settings) {
  const unblocked = (part.baseConfigs || []).filter((c) => !isConfigBlocked(part, c));
  let filtered = applyPortFilter(unblocked, part.selectedPorts);
  if (part.oneConfigPerPort) filtered = reduceToOnePerHostPort(filtered, part.category);
  const partSettings = buildPartSettings(part);

  if (!part.useCleanIp) {
    return { lines: buildOriginalConfigs(filtered, part.category, partSettings), error: null };
  }

  const list = findCleanIpList(settings, part.cleanIpListId);
  const cleanIps = (list.ips || []).filter(Boolean);
  const distribution = part.distribution === "random" ? "random" : "multiply";

  if (cleanIps.length === 0) {
    return { lines: buildOriginalConfigs(filtered, part.category, partSettings), error: "CLEAN_IP_LIST_EMPTY", errorParams: null };
  }

  if (part.category !== "cloudflare" && part.matchKnownRangesOnly !== false) {
    const { inRange, outOfRange } = splitByKnownRanges(filtered);
    const projectedInRange = distribution === "random" ? inRange.length : inRange.length * cleanIps.length;
    const capCountInRange = distribution === "random" ? MAX_FINAL_CONFIGS_PER_PART : Math.max(1, Math.floor(MAX_FINAL_CONFIGS_PER_PART / cleanIps.length));
    const usedInRange = projectedInRange > MAX_FINAL_CONFIGS_PER_PART ? randomSampleCapped(inRange, capCountInRange) : inRange;
    const result = {
      lines: applyCleanIpToConfigs(usedInRange, cleanIps, distribution, part.category, partSettings).concat(
        buildOriginalConfigs(outOfRange, part.category, partSettings)
      ),
      error: null
    };
    if (projectedInRange > MAX_FINAL_CONFIGS_PER_PART) {
      result.error = "PART_OUTPUT_TRUNCATED";
      result.errorParams = { kept: usedInRange.length, total: inRange.length, limit: MAX_FINAL_CONFIGS_PER_PART };
    }
    return result;
  }

  const projected = distribution === "random" ? filtered.length : filtered.length * cleanIps.length;
  const capCount = distribution === "random" ? MAX_FINAL_CONFIGS_PER_PART : Math.max(1, Math.floor(MAX_FINAL_CONFIGS_PER_PART / cleanIps.length));
  const used = projected > MAX_FINAL_CONFIGS_PER_PART ? randomSampleCapped(filtered, capCount) : filtered;
  const result = { lines: applyCleanIpToConfigs(used, cleanIps, distribution, part.category, partSettings), error: null };
  if (projected > MAX_FINAL_CONFIGS_PER_PART) {
    result.error = "PART_OUTPUT_TRUNCATED";
    result.errorParams = { kept: used.length, total: filtered.length, limit: MAX_FINAL_CONFIGS_PER_PART };
  }
  return result;
}

export function generateSourceOutput(source, settings) {
  const allLines = [];
  const partWarnings = [];
  (source.parts || []).forEach((part) => {
    const result = generatePartOutput(part, settings);
    if (result.error) partWarnings.push({ partId: part.id, message: result.error, params: result.errorParams || null });
    if (result.lines) allLines.push(...result.lines);
  });
  return { configs: allLines, partWarnings };
}
