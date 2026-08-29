export function normalizeHostForUrl(ip) {
  const trimmed = (ip || "").trim();
  return trimmed.includes(":") && !trimmed.startsWith("[") ? `[${trimmed}]` : trimmed;
}

export function base64UrlDecode(str) {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "=";
  return decodeURIComponent(escape(atob(s)));
}
