import {
  MAX_URLS_PER_SOURCE,
  MAX_MANUAL_LINES_PER_ADD,
  SLUG_MIN_LENGTH,
  SLUG_MAX_LENGTH,
  NAME_MODE_ORIGINAL
} from "../constants.js";
import { shortId, makeUniqueSlug } from "../utils/ids.js";
import { isValidSlugFormat } from "../utils/slug.js";
import { getSources, saveSources, getSettings } from "../storage/kvStore.js";
import { makeNewPart, populatePartConfigs, assignSequentialNames } from "../configEngine/part.js";
import { extractConfigsFromText } from "../configEngine/parse.js";
import { fetchAndPopulatePart } from "../sync/syncEngine.js";
import { regenerateSourceOutput } from "../sync/scheduling.js";

export async function handleAddSource(request, env) {
  try {
    const data = await request.json();
    const urls = Array.isArray(data.urls) ? data.urls.map((u) => (u || "").trim()).filter(Boolean) : [];
    const manualText = (data.manual || "").trim();
    const manualLines = manualText ? manualText.split("\n").filter((l) => l.trim()) : [];
    if (urls.length === 0 && !manualText) {
      return new Response(JSON.stringify({ success: false, error: "SOURCE_NEEDS_URL_OR_MANUAL" }), { status: 400 });
    }
    if (urls.length > MAX_URLS_PER_SOURCE) {
      return new Response(JSON.stringify({ success: false, error: "SOURCE_MAX_URLS", errorParams: { limit: MAX_URLS_PER_SOURCE } }), { status: 400 });
    }
    if (manualLines.length > MAX_MANUAL_LINES_PER_ADD) {
      return new Response(JSON.stringify({ success: false, error: "SOURCE_MAX_MANUAL_LINES", errorParams: { limit: MAX_MANUAL_LINES_PER_ADD } }), { status: 400 });
    }
    const sources = await getSources(env);
    const settings = await getSettings(env);
    const category = data.category === "independent" ? "independent" : "cloudflare";
    const newSource = {
      id: shortId(),
      slug: makeUniqueSlug(sources),
      name: data.name || "منبع جدید",
      createdAt: new Date().toISOString(),
      lastSync: null,
      parts: []
    };
    const explicitUseCleanIp = typeof data.useCleanIp === "boolean" ? data.useCleanIp : null;
    // v1.1.0: naming mode is chosen up front, separately for the URL
    // section and the manual section, since they default differently
    // (url -> auto-generated names, manual -> keep original names).
    const nameModeUrl = data.nameModeUrl === NAME_MODE_ORIGINAL ? NAME_MODE_ORIGINAL : "auto";
    const nameModeManual = data.nameModeManual === "auto" ? "auto" : NAME_MODE_ORIGINAL;
    // Fetched in parallel (not one-by-one with await in a loop): with several
    // URLs each taking a few seconds, sequential fetching could add up past
    // the Worker's CPU/wall-clock limit on the free plan.
    const urlParts = urls.map((url) => {
      const part = makeNewPart("url", url, category, nameModeUrl);
      if (explicitUseCleanIp !== null) part.useCleanIp = explicitUseCleanIp;
      return part;
    });
    newSource.parts.push(...urlParts);
    await Promise.all(urlParts.map((part) => fetchAndPopulatePart(part, false)));
    if (manualText) {
      const manualPart = makeNewPart("manual", null, category, nameModeManual);
      if (explicitUseCleanIp !== null) manualPart.useCleanIp = explicitUseCleanIp;
      newSource.parts.push(manualPart);
      populatePartConfigs(manualPart, extractConfigsFromText(manualText));
    }
    assignSequentialNames(newSource);
    const totalConfigs = newSource.parts.reduce((sum, p) => sum + p.baseConfigs.length, 0);
    if (totalConfigs === 0) return new Response(JSON.stringify({ success: false, error: "SOURCE_NO_VALID_CONFIGS" }), { status: 400 });
    sources.push(newSource);
    await saveSources(sources, env);
    await env.SUB_DB.put(`slugidx_${newSource.slug}`, newSource.id);
    await regenerateSourceOutput(newSource, settings, env);
    return new Response(JSON.stringify({ success: true, id: newSource.id, slug: newSource.slug }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "SOURCE_ADD_FAILED" }), { status: 500 });
  }
}

export async function handleDeleteSource(id, env) {
  try {
    let sources = await getSources(env);
    const source = sources.find((s) => s.id === id);
    sources = sources.filter((s) => s.id !== id);
    await saveSources(sources, env);
    await env.SUB_DB.delete(`out_${id}`);
    if (source && source.slug) await env.SUB_DB.delete(`slugidx_${source.slug}`);
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "SOURCE_DELETE_FAILED" }), { status: 500 });
  }
}

export async function handleUpdateSourceSlug(sourceId, request, env) {
  try {
    const data = await request.json();
    const newSlug = typeof data.slug === "string" ? data.slug.trim() : "";
    if (!isValidSlugFormat(newSlug)) {
      return new Response(
        JSON.stringify({ success: false, error: "SLUG_INVALID_FORMAT", errorParams: { min: SLUG_MIN_LENGTH, max: SLUG_MAX_LENGTH } }),
        { status: 400 }
      );
    }
    const sources = await getSources(env);
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return new Response(JSON.stringify({ success: false, error: "SOURCE_NOT_FOUND" }), { status: 404 });
    const oldSlug = source.slug;
    if (newSlug === oldSlug) return new Response(JSON.stringify({ success: true, slug: newSlug, unchanged: true }));
    const taken = sources.some((s) => s.id !== sourceId && (s.slug === newSlug || s.id === newSlug));
    if (taken) return new Response(JSON.stringify({ success: false, error: "SLUG_TAKEN" }), { status: 409 });
    source.slug = newSlug;
    await saveSources(sources, env);
    if (oldSlug) await env.SUB_DB.delete(`slugidx_${oldSlug}`);
    await env.SUB_DB.put(`slugidx_${newSlug}`, sourceId);
    return new Response(JSON.stringify({ success: true, slug: newSlug }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "SLUG_UPDATE_FAILED" }), { status: 500 });
  }
}
