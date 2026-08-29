export function parseCookies(cookieHeader) {
  const out = {};
  (cookieHeader || "").split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) out[key] = value;
  });
  return out;
}
