import {
  BUILTIN_CLEAN_IP_LIST_ID,
  DEFAULT_UPLOAD_BOOST_FINGERPRINT,
  DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
  DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
  DEFAULT_UPLOAD_BOOST_PROTOCOLS,
  NAME_MODE_ORIGINAL
} from "../constants.js";
import { getSources, saveSources, getSettings, clampAutoRefreshMinutes } from "../storage/kvStore.js";
import { assignSequentialNames, isConfigBlocked } from "../configEngine/part.js";
import { extractConfigPort, safeHostPreview } from "../configEngine/parse.js";
import { regenerateSourceOutput } from "../sync/scheduling.js";
import { syncSingleSourceLogic } from "../sync/syncEngine.js";

export async function handleUpdatePartSettings(sourceId, partId, request, env) {
  try {
    const data = await request.json();
    const sources = await getSources(env);
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return new Response(JSON.stringify({ success: false, error: "SOURCE_NOT_FOUND" }), { status: 404 });
    const part = (source.parts || []).find((p) => p.id === partId);
    if (!part) return new Response(JSON.stringify({ success: false, error: "PART_NOT_FOUND" }), { status: 404 });
    if (data.category === "independent" || data.category === "cloudflare") part.category = data.category;
    if (typeof data.useCleanIp === "boolean") part.useCleanIp = data.useCleanIp;
    if (typeof data.oneConfigPerPort === "boolean") part.oneConfigPerPort = data.oneConfigPerPort;
    if (typeof data.matchKnownRangesOnly === "boolean") part.matchKnownRangesOnly = data.matchKnownRangesOnly;
    if (data.distribution === "multiply" || data.distribution === "random") part.distribution = data.distribution;
    if (typeof data.cleanIpListId === "string" && data.cleanIpListId) part.cleanIpListId = data.cleanIpListId;
    if (Array.isArray(data.selectedPorts)) part.selectedPorts = data.selectedPorts.map(String).filter(Boolean);
    if (typeof data.uploadBoostEnabled === "boolean") part.uploadBoostEnabled = data.uploadBoostEnabled;
    // v1.1.0: an empty string means "this layer is off"; the literal string
    // "random" is stored as-is (NOT resolved here) and re-resolved to a
    // fresh concrete value on every subscription generation instead - see
    // configEngine/output.js / configEngine/part.js.
    if (typeof data.uploadBoostFingerprint === "string") part.uploadBoostFingerprint = data.uploadBoostFingerprint.trim();
    if (typeof data.uploadBoostCipherSuites === "string") part.uploadBoostCipherSuites = data.uploadBoostCipherSuites.trim();
    if (typeof data.uploadBoostFragmentMask === "string") part.uploadBoostFragmentMask = data.uploadBoostFragmentMask.trim();
    if (Array.isArray(data.uploadBoostProtocols)) {
      const allowed = data.uploadBoostProtocols.filter((p) => p === "vless" || p === "trojan");
      part.uploadBoostProtocols = allowed.length > 0 ? allowed : DEFAULT_UPLOAD_BOOST_PROTOCOLS.slice();
    }
    if (data.nameMode === NAME_MODE_ORIGINAL || data.nameMode === "auto") part.nameMode = data.nameMode;
    if (typeof data.autoNumberEnabled === "boolean") part.autoNumberEnabled = data.autoNumberEnabled;
    if (part.kind === "url") {
      if (typeof data.autoRefreshEnabled === "boolean") part.autoRefreshEnabled = data.autoRefreshEnabled;
      if (data.autoRefreshMinutes !== undefined) part.autoRefreshMinutes = clampAutoRefreshMinutes(data.autoRefreshMinutes);
    }
    // Re-apply naming so a nameMode change (auto <-> original) takes effect
    // on already-fetched configs immediately, not just on the next sync.
    assignSequentialNames(source);
    await saveSources(sources, env);
    const settings = await getSettings(env);
    await regenerateSourceOutput(source, settings, env);
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "PART_UPDATE_FAILED" }), { status: 500 });
  }
}

export async function handleDeletePartFromSource(sourceId, partId, env) {
  try {
    const sources = await getSources(env);
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return new Response(JSON.stringify({ success: false, error: "SOURCE_NOT_FOUND" }), { status: 404 });
    const idx = (source.parts || []).findIndex((p) => p.id === partId);
    if (idx === -1) return new Response(JSON.stringify({ success: false, error: "PART_NOT_FOUND" }), { status: 404 });
    source.parts.splice(idx, 1);
    assignSequentialNames(source);
    await saveSources(sources, env);
    const settings = await getSettings(env);
    await regenerateSourceOutput(source, settings, env);
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "PART_DELETE_FAILED" }), { status: 500 });
  }
}

export async function handleSyncOneSource(sourceId, env) {
  try {
    const sources = await getSources(env);
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return new Response(JSON.stringify({ success: false, error: "SOURCE_NOT_FOUND" }), { status: 404 });
    const settings = await getSettings(env);
    await syncSingleSourceLogic(source, settings, env);
    await saveSources(sources, env);
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "SYNC_FAILED" }), { status: 500 });
  }
}

export async function handleGetSourceConfigs(sourceId, env) {
  const sources = await getSources(env);
  const source = sources.find((s) => s.id === sourceId);
  if (!source) return new Response(JSON.stringify({ success: false, error: "SOURCE_NOT_FOUND" }), { status: 404 });
  const settings = await getSettings(env);
  const parts = (source.parts || []).map((part) => {
    const list = (part.baseConfigs || []).map((c) => ({
      configId: c.configId,
      name: c.name,
      customName: c.customName || null,
      originalName: c.originalName || null,
      protocol: c.protocol,
      isTls: c.isTls,
      host: safeHostPreview(c),
      port: extractConfigPort(c),
      blocked: isConfigBlocked(part, c)
    }));
    const availablePorts = Array.from(new Set(list.map((c) => c.port))).sort((a, b) => Number(a) - Number(b) || (a < b ? -1 : 1));
    return {
      id: part.id,
      kind: part.kind,
      url: part.url,
      category: part.category === "independent" ? "independent" : "cloudflare",
      useCleanIp: part.useCleanIp !== false,
      cleanIpListId: part.cleanIpListId || BUILTIN_CLEAN_IP_LIST_ID,
      distribution: part.distribution === "random" ? "random" : "multiply",
      oneConfigPerPort: !!part.oneConfigPerPort,
      matchKnownRangesOnly: part.matchKnownRangesOnly !== false,
      autoRefreshEnabled: part.kind === "url" ? part.autoRefreshEnabled !== false : null,
      autoRefreshMinutes: part.kind === "url" ? clampAutoRefreshMinutes(part.autoRefreshMinutes) : null,
      uploadBoostEnabled: !!part.uploadBoostEnabled,
      // Empty string is a valid, meaningful value here (means "off") - use
      // typeof, not ||, so we don't accidentally replace a deliberately
      // cleared field with the default.
      uploadBoostFingerprint: typeof part.uploadBoostFingerprint === "string" ? part.uploadBoostFingerprint : DEFAULT_UPLOAD_BOOST_FINGERPRINT,
      uploadBoostCipherSuites: typeof part.uploadBoostCipherSuites === "string" ? part.uploadBoostCipherSuites : DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
      uploadBoostFragmentMask: typeof part.uploadBoostFragmentMask === "string" ? part.uploadBoostFragmentMask : DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
      uploadBoostProtocols: Array.isArray(part.uploadBoostProtocols) && part.uploadBoostProtocols.length > 0 ? part.uploadBoostProtocols : DEFAULT_UPLOAD_BOOST_PROTOCOLS,
      nameMode: part.nameMode === NAME_MODE_ORIGINAL ? NAME_MODE_ORIGINAL : "auto",
      autoNumberEnabled: part.autoNumberEnabled !== false,
      truncated: !!part.truncated,
      lastFetchOk: part.lastFetchOk,
      availablePorts,
      selectedPorts: part.selectedPorts || [],
      configs: list
    };
  });
  return new Response(
    JSON.stringify({
      source: {
        id: source.id,
        name: source.name,
        emojiEnabled: source.emojiEnabled !== false,
        usagePercentEnabled: !!source.usagePercentEnabled,
        usagePercentCfConnectionId: source.usagePercentCfConnectionId || null,
        usagePercentScriptName: source.usagePercentScriptName || null
      },
      parts,
      cleanIpLists: settings.cleanIpLists.map((l) => ({ id: l.id, name: l.name, ips: l.ips, builtin: !!l.builtin })),
      cfConnections: (settings.cfConnections || []).map((c) => ({ id: c.id, label: c.label, accountName: c.accountName || null }))
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
