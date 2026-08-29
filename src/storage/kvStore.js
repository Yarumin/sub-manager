import {
  BUILTIN_CLEAN_IP_LIST_ID,
  DEFAULT_CLEAN_IPS,
  DEFAULT_AUTO_REFRESH_MINUTES,
  MIN_AUTO_REFRESH_MINUTES,
  MAX_AUTO_REFRESH_MINUTES,
  DEFAULT_UPLOAD_BOOST_FINGERPRINT,
  DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
  DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK
} from "../constants.js";

export async function getSettings(env) {
  const defaults = {
    cleanIpLists: [{ id: BUILTIN_CLEAN_IP_LIST_ID, name: "لیست پیش‌فرض پنل", ips: DEFAULT_CLEAN_IPS.slice(), builtin: true }],
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
    if (!merged.cleanIpLists.some((l) => l.id === BUILTIN_CLEAN_IP_LIST_ID)) {
      merged.cleanIpLists.unshift(defaults.cleanIpLists[0]);
    }
    return merged;
  } catch (e) {
    return defaults;
  }
}

export async function saveSettings(settings, env) {
  await env.SUB_DB.put("APP_SETTINGS", JSON.stringify(settings));
}

export function clampAutoRefreshMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_AUTO_REFRESH_MINUTES;
  return Math.min(MAX_AUTO_REFRESH_MINUTES, Math.max(MIN_AUTO_REFRESH_MINUTES, Math.round(n)));
}

export function normalizeSourceShape(source) {
  if (!source.slug) source.slug = source.id;
  (source.parts || []).forEach((part) => {
    if (part.kind === "url") {
      if (part.autoRefreshEnabled === undefined) part.autoRefreshEnabled = true;
      else part.autoRefreshEnabled = !!part.autoRefreshEnabled;
      part.autoRefreshMinutes = clampAutoRefreshMinutes(
        part.autoRefreshMinutes !== undefined ? part.autoRefreshMinutes : DEFAULT_AUTO_REFRESH_MINUTES
      );
    }
    if (typeof part.useCleanIp !== "boolean") part.useCleanIp = part.category !== "independent";
    if (!part.customNamesByFingerprint || typeof part.customNamesByFingerprint !== "object") part.customNamesByFingerprint = {};
    if (part.uploadBoostEnabled === undefined) part.uploadBoostEnabled = false;
    else part.uploadBoostEnabled = !!part.uploadBoostEnabled;
    if (typeof part.uploadBoostFingerprint !== "string") part.uploadBoostFingerprint = DEFAULT_UPLOAD_BOOST_FINGERPRINT;
    if (typeof part.uploadBoostCipherSuites !== "string") part.uploadBoostCipherSuites = DEFAULT_UPLOAD_BOOST_CIPHER_SUITES;
    if (typeof part.uploadBoostFragmentMask !== "string") part.uploadBoostFragmentMask = DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK;
  });
  return source;
}

export async function getSources(env) {
  try {
    const raw = await env.SUB_DB.get("SOURCES");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeSourceShape) : [];
  } catch (e) {
    return [];
  }
}

export async function saveSources(sources, env) {
  await env.SUB_DB.put("SOURCES", JSON.stringify(sources));
}
