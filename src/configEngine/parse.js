import { KNOWN_NOISE_KEYS } from "../constants.js";
import { base64UrlDecode } from "../utils/netutil.js";

export function cleanParamValueForFingerprint(value) {
  if (!value) return value;
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        const cleaned = {};
        Object.keys(obj).sort().forEach((k) => {
          if (!KNOWN_NOISE_KEYS.has(k.toLowerCase())) cleaned[k] = obj[k];
        });
        return JSON.stringify(cleaned);
      }
    } catch (e) {
      /* not JSON, fall through to base64 handling below */
    }
  }
  let prefix = "";
  let core = value;
  let suffix = "";
  if (core.startsWith("/")) {
    prefix = "/";
    core = core.slice(1);
  }
  const qIdx = core.indexOf("?");
  if (qIdx !== -1) {
    suffix = core.slice(qIdx);
    core = core.slice(0, qIdx);
  }
  if (core.length < 8 || !/^[A-Za-z0-9+/_=-]+$/.test(core)) return value;
  try {
    const decoded = base64UrlDecode(core);
    const obj = JSON.parse(decoded);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return value;
    const cleaned = {};
    Object.keys(obj).sort().forEach((k) => {
      if (!KNOWN_NOISE_KEYS.has(k.toLowerCase())) cleaned[k] = obj[k];
    });
    return prefix + JSON.stringify(cleaned) + suffix;
  } catch (e) {
    return value;
  }
}

export function buildUriFingerprint(url) {
  const params = new URLSearchParams(url.search);
  const sorted = Array.from(params.entries())
    .map(([k, v]) => [k, cleanParamValueForFingerprint(v)])
    .sort((a, b) => (a[0] !== b[0] ? (a[0] < b[0] ? -1 : 1) : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  const sortedSearch = sorted.map(([k, v]) => k + "=" + v).join("&");
  return [url.protocol, url.username, url.port, url.pathname, sortedSearch].join("|");
}

export function buildVmessFingerprint(obj) {
  const clone = Object.assign({}, obj);
  delete clone.add;
  delete clone.ps;
  if (typeof clone.path === "string") clone.path = cleanParamValueForFingerprint(clone.path);
  const sortedKeys = Object.keys(clone).sort();
  const normalized = {};
  sortedKeys.forEach((k) => {
    normalized[k] = clone[k];
  });
  return "vmess|" + JSON.stringify(normalized);
}

export function tryParseVmessLegacy(raw) {
  try {
    const b64 = raw.replace("vmess://", "");
    const jsonStr = decodeURIComponent(escape(atob(b64.replace(/-/g, "+").replace(/_/g, "/"))));
    const obj = JSON.parse(jsonStr);
    if (!obj || typeof obj !== "object" || !obj.add || !obj.port) return null;
    const isTls = obj.tls === "tls" || obj.tls === true;
    return {
      kind: "vmess-legacy",
      protocol: "vmess",
      isTls,
      obj,
      fingerprint: buildVmessFingerprint(obj)
    };
  } catch (e) {
    return null;
  }
}

export function parseOneConfigLine(rawLine) {
  const line = (rawLine || "").trim();
  if (!line) return null;
  if (line.startsWith("vmess://")) {
    return tryParseVmessLegacy(line);
  }
  if (line.startsWith("vless://") || line.startsWith("trojan://") || line.startsWith("ss://")) {
    try {
      const url = new URL(line);
      const protocol = url.protocol.replace(":", "");
      const params = new URLSearchParams(url.search);
      const security = params.get("security");
      const isTls = protocol === "trojan" || security === "tls" || security === "reality";
      return {
        kind: "uri",
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

export function extractConfigsFromText(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const results = [];
  for (const line of lines) {
    const parsed = parseOneConfigLine(line);
    if (parsed) results.push(parsed);
  }
  if (results.length === 0) {
    try {
      const decoded = base64UrlDecode(text.trim().replace(/-/g, "+").replace(/_/g, "/"));
      const decodedLines = decoded.split(/\r?\n/);
      for (const line of decodedLines) {
        const parsed = parseOneConfigLine(line);
        if (parsed) results.push(parsed);
      }
    } catch (e) {
      /* not base64-wrapped, and no plain lines parsed either - give up */
    }
  }
  return results;
}

export function extractConfigPort(cfg) {
  try {
    if (cfg.kind === "vmess-legacy") return String(cfg.obj.port || (cfg.isTls ? "443" : "80"));
    const u = new URL(cfg.uri);
    return String(u.port || (cfg.isTls ? "443" : "80"));
  } catch (e) {
    return "?";
  }
}

export function extractHostFromConfig(cfg) {
  if (cfg.kind === "vmess-legacy") return cfg.obj.add || "";
  try {
    return new URL(cfg.uri).hostname.replace(/^\[/, "").replace(/\]$/, "");
  } catch (e) {
    return "";
  }
}

export function extractLogicalDestination(cfg) {
  if (cfg.kind === "vmess-legacy") return (cfg.obj.host || cfg.obj.sni || cfg.obj.add || "").toLowerCase();
  try {
    const url = new URL(cfg.uri);
    const params = new URLSearchParams(url.search);
    const host = params.get("host") || params.get("sni") || url.hostname;
    return host.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
  } catch (e) {
    return "";
  }
}

export function safeHostPreview(cfg) {
  try {
    if (cfg.kind === "vmess-legacy") return cfg.obj.add || "?";
    return new URL(cfg.uri).hostname.replace(/^\[/, "").replace(/\]$/, "");
  } catch (e) {
    return "unknown";
  }
}
