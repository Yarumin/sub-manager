import { MAX_BASE_CONFIGS_PER_PART, MAX_BLOCKED_PER_PART, MAX_CUSTOM_NAMES_PER_PART, MAX_CUSTOM_NAME_LENGTH } from "../constants.js";
import { shortId } from "../utils/ids.js";
import { getSources, saveSources, getSettings } from "../storage/kvStore.js";
import { makeNewPart, assignSequentialNames } from "../configEngine/part.js";
import { parseOneConfigLine } from "../configEngine/parse.js";
import { regenerateSourceOutput } from "../sync/scheduling.js";

export async function handleAddConfigToPart(sourceId, partId, request, env) {
  try {
    const data = await request.json();
    const raw = (data.raw || "").trim();
    if (!raw) return new Response(JSON.stringify({ success: false, error: "CONFIG_EMPTY" }), { status: 400 });
    const sources = await getSources(env);
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return new Response(JSON.stringify({ success: false, error: "SOURCE_NOT_FOUND" }), { status: 404 });
    source.parts = source.parts || [];
    let part = source.parts.find((p) => p.id === partId);
    if (!part && partId === "manual-new") {
      part = makeNewPart("manual", null, "cloudflare");
      source.parts.push(part);
    }
    if (!part) return new Response(JSON.stringify({ success: false, error: "PART_NOT_FOUND" }), { status: 404 });
    const parsed = parseOneConfigLine(raw);
    if (!parsed) return new Response(JSON.stringify({ success: false, error: "CONFIG_INVALID_FORMAT" }), { status: 400 });
    part.baseConfigs = part.baseConfigs || [];
    if (part.baseConfigs.length >= MAX_BASE_CONFIGS_PER_PART) {
      return new Response(JSON.stringify({ success: false, error: "PART_MAX_CONFIGS", errorParams: { limit: MAX_BASE_CONFIGS_PER_PART } }), { status: 400 });
    }
    if (part.baseConfigs.some((c) => c.fingerprint === parsed.fingerprint)) {
      return new Response(JSON.stringify({ success: false, error: "CONFIG_DUPLICATE" }), { status: 409 });
    }
    parsed.configId = shortId();
    part.baseConfigs.push(parsed);
    assignSequentialNames(source);
    await saveSources(sources, env);
    const settings = await getSettings(env);
    await regenerateSourceOutput(source, settings, env);
    return new Response(JSON.stringify({ success: true, partId: part.id }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CONFIG_ADD_FAILED" }), { status: 500 });
  }
}

export async function handleDeleteConfigFromPart(sourceId, partId, configId, env) {
  try {
    const sources = await getSources(env);
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return new Response(JSON.stringify({ success: false, error: "SOURCE_NOT_FOUND" }), { status: 404 });
    const part = (source.parts || []).find((p) => p.id === partId);
    if (!part) return new Response(JSON.stringify({ success: false, error: "PART_NOT_FOUND" }), { status: 404 });
    const list = part.baseConfigs || [];
    const idx = list.findIndex((c) => c.configId === configId);
    if (idx === -1) return new Response(JSON.stringify({ success: false, error: "CONFIG_NOT_FOUND" }), { status: 404 });
    const deletedFingerprint = list[idx].fingerprint;
    list.splice(idx, 1);
    part.blockedFingerprints = (part.blockedFingerprints || []).filter((f) => f !== deletedFingerprint);
    if (part.customNamesByFingerprint) delete part.customNamesByFingerprint[deletedFingerprint];
    assignSequentialNames(source);
    await saveSources(sources, env);
    const settings = await getSettings(env);
    await regenerateSourceOutput(source, settings, env);
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CONFIG_DELETE_FAILED" }), { status: 500 });
  }
}

export async function handleToggleBlockConfig(sourceId, partId, configId, env) {
  try {
    const sources = await getSources(env);
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return new Response(JSON.stringify({ success: false, error: "SOURCE_NOT_FOUND" }), { status: 404 });
    const part = (source.parts || []).find((p) => p.id === partId);
    if (!part) return new Response(JSON.stringify({ success: false, error: "PART_NOT_FOUND" }), { status: 404 });
    const cfg = (part.baseConfigs || []).find((c) => c.configId === configId);
    if (!cfg) return new Response(JSON.stringify({ success: false, error: "CONFIG_NOT_FOUND" }), { status: 404 });
    part.blockedFingerprints = part.blockedFingerprints || [];
    const wasBlocked = part.blockedFingerprints.includes(cfg.fingerprint);
    if (!wasBlocked) {
      if (part.blockedFingerprints.length >= MAX_BLOCKED_PER_PART) {
        return new Response(JSON.stringify({ success: false, error: "PART_MAX_BLOCKED", errorParams: { limit: MAX_BLOCKED_PER_PART } }), { status: 400 });
      }
      part.blockedFingerprints.push(cfg.fingerprint);
    } else {
      part.blockedFingerprints = part.blockedFingerprints.filter((fp) => fp !== cfg.fingerprint);
    }
    await saveSources(sources, env);
    const settings = await getSettings(env);
    await regenerateSourceOutput(source, settings, env);
    return new Response(JSON.stringify({ success: true, blocked: !wasBlocked }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CONFIG_TOGGLE_FAILED" }), { status: 500 });
  }
}

export async function handleBulkSetConfigsIncluded(sourceId, partId, request, env) {
  try {
    const data = await request.json();
    const selected = data.selected !== false;
    const sources = await getSources(env);
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return new Response(JSON.stringify({ success: false, error: "SOURCE_NOT_FOUND" }), { status: 404 });
    const part = (source.parts || []).find((p) => p.id === partId);
    if (!part) return new Response(JSON.stringify({ success: false, error: "PART_NOT_FOUND" }), { status: 404 });
    const totalCount = (part.baseConfigs || []).length;
    let blockedCount = 0;
    let capped = false;
    if (selected) {
      part.blockedFingerprints = [];
    } else {
      const allFingerprints = (part.baseConfigs || []).map((c) => c.fingerprint);
      capped = allFingerprints.length > MAX_BLOCKED_PER_PART;
      part.blockedFingerprints = allFingerprints.slice(0, MAX_BLOCKED_PER_PART);
      blockedCount = part.blockedFingerprints.length;
    }
    await saveSources(sources, env);
    const settings = await getSettings(env);
    await regenerateSourceOutput(source, settings, env);
    return new Response(JSON.stringify({ success: true, selected, blockedCount, totalCount, capped }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CONFIG_BULK_TOGGLE_FAILED" }), { status: 500 });
  }
}

export async function handleSetConfigCustomName(sourceId, partId, configId, request, env) {
  try {
    const data = await request.json();
    const name = typeof data.name === "string" ? data.name.trim().slice(0, MAX_CUSTOM_NAME_LENGTH) : "";
    const sources = await getSources(env);
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return new Response(JSON.stringify({ success: false, error: "SOURCE_NOT_FOUND" }), { status: 404 });
    const part = (source.parts || []).find((p) => p.id === partId);
    if (!part) return new Response(JSON.stringify({ success: false, error: "PART_NOT_FOUND" }), { status: 404 });
    const cfg = (part.baseConfigs || []).find((c) => c.configId === configId);
    if (!cfg) return new Response(JSON.stringify({ success: false, error: "CONFIG_NOT_FOUND" }), { status: 404 });
    part.customNamesByFingerprint = part.customNamesByFingerprint || {};
    if (name) {
      cfg.customName = name;
      if (!(cfg.fingerprint in part.customNamesByFingerprint) && Object.keys(part.customNamesByFingerprint).length >= MAX_CUSTOM_NAMES_PER_PART) {
        return new Response(JSON.stringify({ success: false, error: "PART_MAX_CUSTOM_NAMES", errorParams: { limit: MAX_CUSTOM_NAMES_PER_PART } }), { status: 400 });
      }
      part.customNamesByFingerprint[cfg.fingerprint] = name;
    } else {
      delete cfg.customName;
      delete part.customNamesByFingerprint[cfg.fingerprint];
    }
    await saveSources(sources, env);
    const settings = await getSettings(env);
    await regenerateSourceOutput(source, settings, env);
    return new Response(JSON.stringify({ success: true, customName: cfg.customName || null }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CONFIG_RENAME_FAILED" }), { status: 500 });
  }
}

export async function handleBatchUpdatePartConfigs(sourceId, partId, request, env) {
  try {
    const data = await request.json();
    const order = Array.isArray(data.order) ? data.order.filter((id) => typeof id === "string") : null;
    const deletedConfigIds = new Set(Array.isArray(data.deletedConfigIds) ? data.deletedConfigIds.filter((id) => typeof id === "string") : []);
    const blockedConfigIds = new Set(Array.isArray(data.blockedConfigIds) ? data.blockedConfigIds.filter((id) => typeof id === "string") : []);
    const sources = await getSources(env);
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return new Response(JSON.stringify({ success: false, error: "SOURCE_NOT_FOUND" }), { status: 404 });
    const part = (source.parts || []).find((p) => p.id === partId);
    if (!part) return new Response(JSON.stringify({ success: false, error: "PART_NOT_FOUND" }), { status: 404 });
    part.baseConfigs = part.baseConfigs || [];
    part.blockedFingerprints = part.blockedFingerprints || [];
    part.customNamesByFingerprint = part.customNamesByFingerprint || {};
    if (deletedConfigIds.size > 0) {
      const survivors = [];
      for (const cfg of part.baseConfigs) {
        if (!deletedConfigIds.has(cfg.configId)) {
          survivors.push(cfg);
          continue;
        }
        part.blockedFingerprints = part.blockedFingerprints.filter((f) => f !== cfg.fingerprint);
        delete part.customNamesByFingerprint[cfg.fingerprint];
      }
      part.baseConfigs = survivors;
    }
    if (order) {
      const byId = new Map(part.baseConfigs.map((c) => [c.configId, c]));
      const reordered = [];
      order.forEach((id) => {
        if (byId.has(id)) {
          reordered.push(byId.get(id));
          byId.delete(id);
        }
      });
      byId.forEach((c) => reordered.push(c));
      part.baseConfigs = reordered;
    }
    let capped = false;
    const newBlockedFingerprints = [];
    part.baseConfigs.forEach((cfg) => {
      if (!blockedConfigIds.has(cfg.configId)) return;
      if (newBlockedFingerprints.length >= MAX_BLOCKED_PER_PART) {
        capped = true;
        return;
      }
      newBlockedFingerprints.push(cfg.fingerprint);
    });
    part.blockedFingerprints = newBlockedFingerprints;
    assignSequentialNames(source);
    await saveSources(sources, env);
    const settings = await getSettings(env);
    await regenerateSourceOutput(source, settings, env);
    return new Response(JSON.stringify({ success: true, capped }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CONFIG_BATCH_UPDATE_FAILED" }), { status: 500 });
  }
}

export async function handleReorderPartConfigs(sourceId, partId, request, env) {
  try {
    const data = await request.json();
    const order = Array.isArray(data.order) ? data.order : [];
    const sources = await getSources(env);
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return new Response(JSON.stringify({ success: false, error: "SOURCE_NOT_FOUND" }), { status: 404 });
    const part = (source.parts || []).find((p) => p.id === partId);
    if (!part) return new Response(JSON.stringify({ success: false, error: "PART_NOT_FOUND" }), { status: 404 });
    const current = part.baseConfigs || [];
    const byId = new Map(current.map((c) => [c.configId, c]));
    const reordered = [];
    order.forEach((id) => {
      if (byId.has(id)) {
        reordered.push(byId.get(id));
        byId.delete(id);
      }
    });
    byId.forEach((c) => reordered.push(c));
    part.baseConfigs = reordered;
    assignSequentialNames(source);
    await saveSources(sources, env);
    const settings = await getSettings(env);
    await regenerateSourceOutput(source, settings, env);
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CONFIG_REORDER_FAILED" }), { status: 500 });
  }
}
