import { CLOUDFLARE_IP_RANGES } from "../constants.js";

export function ipv4ToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

export function ipv6ToBigInt(ip) {
  let host = ip;
  if (host.includes("::")) {
    const [left, right] = host.split("::");
    const leftParts = left ? left.split(":") : [];
    const rightParts = right ? right.split(":") : [];
    const missing = 8 - leftParts.length - rightParts.length;
    if (missing < 0) return null;
    host = [...leftParts, ...Array(missing).fill("0"), ...rightParts].join(":");
  }
  const groups = host.split(":");
  if (groups.length !== 8) return null;
  let result = 0n;
  for (const g of groups) {
    const v = parseInt(g || "0", 16);
    if (isNaN(v)) return null;
    result = (result << 16n) | BigInt(v);
  }
  return result;
}

export function ipInCidr(ip, cidr) {
  try {
    const [range, bitsStr] = cidr.split("/");
    const bits = parseInt(bitsStr, 10);
    if (ip.includes(":") && range.includes(":")) {
      const ipInt = ipv6ToBigInt(ip);
      const rangeInt = ipv6ToBigInt(range);
      if (ipInt === null || rangeInt === null) return false;
      const mask = bits === 0 ? 0n : (~0n << BigInt(128 - bits)) & ((1n << 128n) - 1n);
      return (ipInt & mask) === (rangeInt & mask);
    } else if (!ip.includes(":") && !range.includes(":")) {
      const ipInt = ipv4ToInt(ip);
      const rangeInt = ipv4ToInt(range);
      if (ipInt === null || rangeInt === null) return false;
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return ((ipInt & mask) >>> 0) === ((rangeInt & mask) >>> 0);
    }
    return false;
  } catch (e) {
    return false;
  }
}

export function isKnownCloudflareIp(ip) {
  return CLOUDFLARE_IP_RANGES.some((cidr) => ipInCidr(ip, cidr));
}
