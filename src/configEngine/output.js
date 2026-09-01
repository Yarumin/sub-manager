import {
  BUILTIN_CLEAN_IP_LIST_ID,
  DEFAULT_UPLOAD_BOOST_FINGERPRINT,
  DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
  DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
  DEFAULT_UPLOAD_BOOST_PROTOCOLS,
  MAX_FINAL_CONFIGS_PER_PART,
  USAGE_PERCENT_SENTINEL
} from "../constants.js";
import { normalizeHostForUrl } from "../utils/netutil.js";
import { isKnownCloudflareIp } from "../utils/cidr.js";
import { extractConfigPort, extractHostFromConfig, extractLogicalDestination } from "./parse.js";
import { isConfigBlocked, resolveUploadBoostFieldForGeneration } from "./part.js";

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

export function getConfigEmoji(base, category, emojiEnabled) {
  if (emojiEnabled === false) return "";
  if (category === "independent") return INDEPENDENT_EMOJI;
  const port = extractConfigPort(base);
  if (base.isTls) return CLOUDFLARE_TLS_PORT_EMOJIS[port] || UNKNOWN_PORT_EMOJI;
  return CLOUDFLARE_NONTLS_PORT_EMOJIS[port] || UNKNOWN_PORT_EMOJI;
}

// `usagePercentEnabled` only makes sense for worker (cloudflare-category)
// configs: it embeds a sentinel placeholder that publicApi/serveSubscription.js
// substitutes with a live-fetched usage percentage at request time, kept
// separate from the cached generation pipeline (see scheduling.js).
// Skipped for vmess-legacy configs: those are base64-encoded as a whole at
// generation time (see applyHostToConfig/passThroughConfig below), so a
// value only known later at serve time cannot be spliced back in.
export function buildDisplayName(base, category, displayOptions) {
  const opts = displayOptions || {};
  const emoji = getConfigEmoji(base, category, opts.emojiEnabled);
  const baseName = base.customName || base.name;
  const canShowUsagePercent = opts.usagePercentEnabled && category === "cloudflare" && base.kind !== "vmess-legacy";
  const suffix = canShowUsagePercent ? " (" + USAGE_PERCENT_SENTINEL + "%)" : "";
  return (emoji ? emoji + " " : "") + baseName + suffix;
}

export function applyUploadBoost(configUri, partSettings) {
  if (!partSettings || !partSettings.uploadBoostEnabled) return configUri;
  try {
    const url = new URL(configUri);
    const protocol = url.protocol.replace(":", "");
    if (protocol !== "vless" && protocol !== "trojan") return configUri;
    // v1.1.0: boost can now be restricted to a subset of protocols instead
    // of always applying to both VLESS and Trojan.
    const allowedProtocols = Array.isArray(partSettings.uploadBoostProtocols) && partSettings.uploadBoostProtocols.length > 0
      ? partSettings.uploadBoostProtocols
      : DEFAULT_UPLOAD_BOOST_PROTOCOLS;
    if (!allowedProtocols.includes(protocol)) return configUri;
    const params = new URLSearchParams(url.search);
    const security = params.get("security");
    const isTlsLike = protocol === "trojan" || security === "tls" || security === "reality";
    if (!isTlsLike) return configUri;
    // v1.1.0: each layer is either an empty string (disabled), "none"
    // (fingerprint only - explicitly "no fingerprint value"), or a value to
    // inject. Any literal "random" was already re-resolved to a concrete
    // value by buildPartSettings() right before this function was called,
    // fresh for this generation pass - see configEngine/part.js
    // resolveUploadBoostFieldForGeneration.
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

export function applyHostToConfig(base, rawIp, category, partSettings, displayOptions) {
  const ip = normalizeHostForUrl(rawIp);
  const displayName = buildDisplayName(base, category, displayOptions);
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

export function passThroughConfig(base, category, partSettings, displayOptions) {
  const displayName = buildDisplayName(base, category, displayOptions);
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

export function buildOriginalConfigs(baseConfigs, category, partSettings, displayOptions) {
  const out = [];
  (baseConfigs || []).forEach((base) => {
    try {
      out.push(passThroughConfig(base, category, partSettings, displayOptions));
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

export function applyCleanIpToConfigs(baseConfigs, cleanIps, distribution, category, partSettings, displayOptions) {
  const safeIps = (Array.isArray(cleanIps) ? cleanIps : []).filter(Boolean);
  const out = [];
  if (safeIps.length === 0) return out;
  (baseConfigs || []).forEach((base) => {
    try {
      if (distribution === "random") {
        const ip = safeIps[Math.floor(Math.random() * safeIps.length)];
        out.push(applyHostToConfig(base, ip, category, partSettings, displayOptions));
      } else {
        safeIps.forEach((ip) => out.push(applyHostToConfig(base, ip, category, partSettings, displayOptions)));
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
  const fingerprint = typeof part.uploadBoostFingerprint === "string" ? part.uploadBoostFingerprint : DEFAULT_UPLOAD_BOOST_FINGERPRINT;
  const cipherSuites = typeof part.uploadBoostCipherSuites === "string" ? part.uploadBoostCipherSuites : DEFAULT_UPLOAD_BOOST_CIPHER_SUITES;
  const fragmentMask = typeof part.uploadBoostFragmentMask === "string" ? part.uploadBoostFragmentMask : DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK;
  return {
    uploadBoostEnabled: !!part.uploadBoostEnabled,
    // v1.1.0: empty string genuinely means "disabled" for each of these
    // three - only fall back to a default when the field is missing
    // entirely (e.g. legacy/partial data), never when it was deliberately
    // cleared by the user. A stored literal "random" is re-resolved to a
    // fresh concrete value right here, on every single generation pass, so
    // it actually rotates on every sync rather than being fixed once.
    uploadBoostFingerprint: resolveUploadBoostFieldForGeneration("fingerprint", fingerprint),
    uploadBoostCipherSuites: resolveUploadBoostFieldForGeneration("cipherSuites", cipherSuites),
    uploadBoostFragmentMask: resolveUploadBoostFieldForGeneration("fragmentMask", fragmentMask),
    uploadBoostProtocols: Array.isArray(part.uploadBoostProtocols) && part.uploadBoostProtocols.length > 0
      ? part.uploadBoostProtocols
      : DEFAULT_UPLOAD_BOOST_PROTOCOLS
  };
}

// Source-level display options (v1.1.0): one emoji/usage-percent choice for
// the whole subscription, applied uniformly to its configs at generation
// time (see storage/scheduling.js).
export function buildDisplayOptions(source) {
  return {
    emojiEnabled: source.emojiEnabled !== false,
    usagePercentEnabled: !!(source.usagePercentEnabled && source.usagePercentCfConnectionId && source.usagePercentScriptName)
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

export function generatePartOutput(part, settings, displayOptions) {
  const unblocked = (part.baseConfigs || []).filter((c) => !isConfigBlocked(part, c));
  let filtered = applyPortFilter(unblocked, part.selectedPorts);
  if (part.oneConfigPerPort) filtered = reduceToOnePerHostPort(filtered, part.category);
  const partSettings = buildPartSettings(part);

  if (!part.useCleanIp) {
    return { lines: buildOriginalConfigs(filtered, part.category, partSettings, displayOptions), error: null };
  }

  const list = findCleanIpList(settings, part.cleanIpListId);
  const cleanIps = (list.ips || []).filter(Boolean);
  const distribution = part.distribution === "random" ? "random" : "multiply";

  if (cleanIps.length === 0) {
    return { lines: buildOriginalConfigs(filtered, part.category, partSettings, displayOptions), error: "CLEAN_IP_LIST_EMPTY", errorParams: null };
  }

  if (part.category !== "cloudflare" && part.matchKnownRangesOnly !== false) {
    const { inRange, outOfRange } = splitByKnownRanges(filtered);
    const projectedInRange = distribution === "random" ? inRange.length : inRange.length * cleanIps.length;
    const capCountInRange = distribution === "random" ? MAX_FINAL_CONFIGS_PER_PART : Math.max(1, Math.floor(MAX_FINAL_CONFIGS_PER_PART / cleanIps.length));
    const usedInRange = projectedInRange > MAX_FINAL_CONFIGS_PER_PART ? randomSampleCapped(inRange, capCountInRange) : inRange;
    const result = {
      lines: applyCleanIpToConfigs(usedInRange, cleanIps, distribution, part.category, partSettings, displayOptions).concat(
        buildOriginalConfigs(outOfRange, part.category, partSettings, displayOptions)
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
  const result = { lines: applyCleanIpToConfigs(used, cleanIps, distribution, part.category, partSettings, displayOptions), error: null };
  if (projected > MAX_FINAL_CONFIGS_PER_PART) {
    result.error = "PART_OUTPUT_TRUNCATED";
    result.errorParams = { kept: used.length, total: filtered.length, limit: MAX_FINAL_CONFIGS_PER_PART };
  }
  return result;
}

export function generateSourceOutput(source, settings) {
  const allLines = [];
  const partWarnings = [];
  const displayOptions = buildDisplayOptions(source);
  (source.parts || []).forEach((part) => {
    const result = generatePartOutput(part, settings, displayOptions);
    if (result.error) partWarnings.push({ partId: part.id, message: result.error, params: result.errorParams || null });
    if (result.lines) allLines.push(...result.lines);
  });
  // usagePercentTarget travels alongside the cached output so the (fast,
  // full-source-independent) public serve path can do the live substitution
  // without needing to reload the whole source object - see
  // publicApi/serveSubscription.js.
  const usagePercentTarget = displayOptions.usagePercentEnabled
    ? { cfConnectionId: source.usagePercentCfConnectionId, scriptName: source.usagePercentScriptName }
    : null;
  return { configs: allLines, partWarnings, usagePercentTarget };
}
