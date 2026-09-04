import {
  BACKUP_FORMAT_VERSION,
  BUILTIN_CLEAN_IP_LIST_ID,
  DEFAULT_CLEAN_IPS,
  DEFAULT_AUTO_REFRESH_MINUTES,
  DEFAULT_UPLOAD_BOOST_FINGERPRINT,
  DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
  DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
  DEFAULT_UPLOAD_BOOST_PROTOCOLS,
  DEFAULT_NAME_MODE_URL,
  DEFAULT_NAME_MODE_MANUAL,
  NAME_MODE_ORIGINAL,
  MAX_BASE_CONFIGS_PER_PART,
  MAX_CUSTOM_NAME_LENGTH
} from "../constants.js";
import { shortId } from "../utils/ids.js";
import { isValidSlugFormat } from "../utils/slug.js";
import { getSources, getSettings, clampAutoRefreshMinutes } from "./kvStore.js";
import { parseOneConfigLine, tryParseVmessLegacy } from "../configEngine/parse.js";
import { assignSequentialNames } from "../configEngine/part.js";

export const BACKUP_SECTION_KEYS = ["sources", "cleanIpLists", "cfConnections"];

export async function buildBackupData(env, sections) {
  const wantSources = sections.has("sources");
  const wantCleanIpLists = sections.has("cleanIpLists");
  const wantCfConnections = sections.has("cfConnections");
  const sources = wantSources ? await getSources(env) : [];
  const settings = await getSettings(env);
  return {
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    sectionsIncluded: Array.from(sections),
    sources,
    settings: {
      cleanIpLists: wantCleanIpLists ? settings.cleanIpLists : [],
      cfConnections: wantCfConnections ? settings.cfConnections : []
    }
  };
}

export function revalidateImportedConfig(c) {
  if (!c || typeof c !== "object") return null;
  let rebuilt = null;
  if (c.kind === "uri" && typeof c.uri === "string") {
    rebuilt = parseOneConfigLine(c.uri);
  } else if (c.kind === "vmess-legacy" && c.obj && typeof c.obj === "object" && c.obj.add && c.obj.port) {
    rebuilt = tryParseVmessLegacy("vmess://" + btoa(unescape(encodeURIComponent(JSON.stringify(c.obj)))));
  }
  if (!rebuilt) return null;
  rebuilt.configId = typeof c.configId === "string" && c.configId ? c.configId : shortId();
  if (c.customName) rebuilt.customName = String(c.customName).trim().slice(0, MAX_CUSTOM_NAME_LENGTH) || undefined;
  // originalName is re-derived by parseOneConfigLine/tryParseVmessLegacy
  // above already; nothing extra to restore here.
  return rebuilt;
}

export function normalizeImportedBackup(raw) {
  if (!raw || typeof raw !== "object") throw new Error("invalid backup file");

  const sources = Array.isArray(raw.sources) ? raw.sources : [];
  const normalizedSources = sources
    .filter((s) => s && typeof s === "object" && typeof s.id === "string")
    .map((s) => ({
      id: s.id,
      slug: typeof s.slug === "string" && isValidSlugFormat(s.slug) ? s.slug : undefined,
      name: typeof s.name === "string" ? s.name : "منبع بازیابی‌شده",
      createdAt: typeof s.createdAt === "string" ? s.createdAt : new Date().toISOString(),
      lastSync: typeof s.lastSync === "string" ? s.lastSync : null,
      parts: Array.isArray(s.parts)
        ? s.parts
            .filter((p) => p && typeof p === "object" && typeof p.id === "string")
            .map((p) => {
              const kind = p.kind === "manual" ? "manual" : "url";
              const category = p.category === "independent" ? "independent" : "cloudflare";
              const part = {
                id: p.id,
                kind,
                url: typeof p.url === "string" ? p.url : null,
                category,
                useCleanIp: typeof p.useCleanIp === "boolean" ? p.useCleanIp : category === "cloudflare",
                cleanIpListId: typeof p.cleanIpListId === "string" ? p.cleanIpListId : BUILTIN_CLEAN_IP_LIST_ID,
                distribution: p.distribution === "random" ? "random" : "multiply",
                selectedPorts: Array.isArray(p.selectedPorts) ? p.selectedPorts.map(String).filter(Boolean) : [],
                oneConfigPerPort: !!p.oneConfigPerPort,
                matchKnownRangesOnly: p.matchKnownRangesOnly !== false,
                baseConfigs: Array.isArray(p.baseConfigs)
                  ? p.baseConfigs.map(revalidateImportedConfig).filter(Boolean).slice(0, MAX_BASE_CONFIGS_PER_PART)
                  : [],
                blockedFingerprints: Array.isArray(p.blockedFingerprints) ? p.blockedFingerprints.filter((f) => typeof f === "string") : [],
                customNamesByFingerprint:
                  p.customNamesByFingerprint && typeof p.customNamesByFingerprint === "object"
                    ? Object.fromEntries(
                        Object.entries(p.customNamesByFingerprint)
                          .filter(([k, v]) => typeof k === "string" && typeof v === "string" && v)
                          .map(([k, v]) => [k, v.trim().slice(0, MAX_CUSTOM_NAME_LENGTH)])
                      )
                    : {},
                uploadBoostEnabled: !!p.uploadBoostEnabled,
                uploadBoostFingerprint: typeof p.uploadBoostFingerprint === "string" ? p.uploadBoostFingerprint : DEFAULT_UPLOAD_BOOST_FINGERPRINT,
                uploadBoostCipherSuites: typeof p.uploadBoostCipherSuites === "string" ? p.uploadBoostCipherSuites : DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
                uploadBoostFragmentMask: typeof p.uploadBoostFragmentMask === "string" ? p.uploadBoostFragmentMask : DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
                uploadBoostProtocols:
                  Array.isArray(p.uploadBoostProtocols) && p.uploadBoostProtocols.length > 0
                    ? p.uploadBoostProtocols.filter((x) => x === "vless" || x === "trojan")
                    : DEFAULT_UPLOAD_BOOST_PROTOCOLS.slice(),
                nameMode: p.nameMode === NAME_MODE_ORIGINAL || p.nameMode === "auto" ? p.nameMode : kind === "manual" ? DEFAULT_NAME_MODE_MANUAL : DEFAULT_NAME_MODE_URL,
                autoNumberEnabled: typeof p.autoNumberEnabled === "boolean" ? p.autoNumberEnabled : true,
                // Per-part display settings. Backups exported before v1.1.5
                // stored these at the source level instead - fall back to
                // that when the part itself doesn't have its own value.
                emojiEnabled: typeof p.emojiEnabled === "boolean" ? p.emojiEnabled : typeof s.emojiEnabled === "boolean" ? s.emojiEnabled : true,
                usagePercentEnabled: !!(
                  (typeof p.usagePercentEnabled === "boolean" ? p.usagePercentEnabled : s.usagePercentEnabled) &&
                  (typeof p.usagePercentCfConnectionId === "string" ? p.usagePercentCfConnectionId : s.usagePercentCfConnectionId) &&
                  (typeof p.usagePercentScriptName === "string" ? p.usagePercentScriptName : s.usagePercentScriptName)
                ),
                usagePercentCfConnectionId:
                  typeof p.usagePercentCfConnectionId === "string"
                    ? p.usagePercentCfConnectionId
                    : typeof s.usagePercentCfConnectionId === "string"
                      ? s.usagePercentCfConnectionId
                      : null,
                usagePercentScriptName:
                  typeof p.usagePercentScriptName === "string"
                    ? p.usagePercentScriptName
                    : typeof s.usagePercentScriptName === "string"
                      ? s.usagePercentScriptName
                      : null,
                truncated: !!p.truncated,
                lastFetchOk: typeof p.lastFetchOk === "boolean" ? p.lastFetchOk : null,
                lastFetchedAt: typeof p.lastFetchedAt === "string" ? p.lastFetchedAt : null
              };
              if (kind === "url") {
                part.autoRefreshEnabled = p.autoRefreshEnabled !== false;
                part.autoRefreshMinutes = clampAutoRefreshMinutes(
                  p.autoRefreshMinutes !== undefined ? p.autoRefreshMinutes : DEFAULT_AUTO_REFRESH_MINUTES
                );
              }
              return part;
            })
        : []
    }));
  normalizedSources.forEach(assignSequentialNames);

  const rawSettings = raw.settings && typeof raw.settings === "object" ? raw.settings : {};
  const normalizedSettings = {
    cleanIpLists:
      Array.isArray(rawSettings.cleanIpLists) && rawSettings.cleanIpLists.length > 0
        ? rawSettings.cleanIpLists
            .filter((l) => l && typeof l === "object" && typeof l.id === "string")
            .map((l) => ({
              id: l.id,
              name: typeof l.name === "string" ? l.name : "لیست بازیابی‌شده",
              ips: Array.isArray(l.ips) ? l.ips.map(String).filter(Boolean) : [],
              builtin: l.id === BUILTIN_CLEAN_IP_LIST_ID
            }))
        : [{ id: BUILTIN_CLEAN_IP_LIST_ID, name: "لیست پیش‌فرض پنل", ips: DEFAULT_CLEAN_IPS.slice(), builtin: true }],
    cfConnections: Array.isArray(rawSettings.cfConnections)
      ? rawSettings.cfConnections
          .filter((c) => c && typeof c === "object" && typeof c.id === "string")
          .map((c) => ({
            id: c.id,
            label: typeof c.label === "string" ? c.label : "اکانت کلودفلر",
            accountId: typeof c.accountId === "string" ? c.accountId : "",
            accountName: typeof c.accountName === "string" ? c.accountName : null,
            apiToken: typeof c.apiToken === "string" ? c.apiToken : ""
          }))
      : []
  };

  if (!normalizedSettings.cleanIpLists.some((l) => l.id === BUILTIN_CLEAN_IP_LIST_ID)) {
    normalizedSettings.cleanIpLists.unshift({
      id: BUILTIN_CLEAN_IP_LIST_ID,
      name: "لیست پیش‌فرض پنل",
      ips: DEFAULT_CLEAN_IPS.slice(),
      builtin: true
    });
  }

  return { sources: normalizedSources, settings: normalizedSettings };
}
