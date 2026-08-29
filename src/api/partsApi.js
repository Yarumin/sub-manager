import {
  BUILTIN_CLEAN_IP_LIST_ID,
  DEFAULT_UPLOAD_BOOST_FINGERPRINT,
  DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
  DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK
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
    if (typeof data.uploadBoostFingerprint === "string") part.uploadBoostFingerprint = data.uploadBoostFingerprint;
    if (typeof data.uploadBoostCipherSuites === "string") part.uploadBoostCipherSuites = data.uploadBoostCipherSuites.trim();
    if (typeof data.uploadBoostFragmentMask === "string") part.uploadBoostFragmentMask = data.uploadBoostFragmentMask.trim();
    if (part.kind === "url") {
      if (typeof data.autoRefreshEnabled === "boolean") part.autoRefreshEnabled = data.autoRefreshEnabled;
      if (data.autoRefreshMinutes !== undefined) part.autoRefreshMinutes = clampAutoRefreshMinutes(data.autoRefreshMinutes);
    }
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
      uploadBoostFingerprint: part.uploadBoostFingerprint || DEFAULT_UPLOAD_BOOST_FINGERPRINT,
      uploadBoostCipherSuites: part.uploadBoostCipherSuites || DEFAULT_UPLOAD_BOOST_CIPHER_SUITES,
      uploadBoostFragmentMask: part.uploadBoostFragmentMask || DEFAULT_UPLOAD_BOOST_FRAGMENT_MASK,
      truncated: !!part.truncated,
      lastFetchOk: part.lastFetchOk,
      availablePorts,
      selectedPorts: part.selectedPorts || [],
      configs: list
    };
  });
  return new Response(
    JSON.stringify({
      parts,
      cleanIpLists: settings.cleanIpLists.map((l) => ({ id: l.id, name: l.name, ips: l.ips, builtin: !!l.builtin }))
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
