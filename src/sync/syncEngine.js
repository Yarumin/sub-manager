import { SUBSCRIPTION_FETCH_TIMEOUT_MS } from "../constants.js";
import { extractConfigsFromText } from "../configEngine/parse.js";
import { populatePartConfigs, resyncPart, assignSequentialNames } from "../configEngine/part.js";
import { getSources, saveSources, getSettings, clampAutoRefreshMinutes } from "../storage/kvStore.js";
import { regenerateSourceOutput } from "./scheduling.js";

export async function fetchSubscriptionContent(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUBSCRIPTION_FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SubManager/1.0)" },
      signal: controller.signal
    });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    return await resp.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAndPopulatePart(part, isResync) {
  try {
    const rawText = await fetchSubscriptionContent(part.url);
    const extracted = rawText ? extractConfigsFromText(rawText) : [];
    if (isResync && extracted.length === 0 && (part.baseConfigs || []).length > 0) {
      part.lastFetchOk = false;
    } else {
      if (isResync) resyncPart(part, extracted);
      else populatePartConfigs(part, extracted);
      part.lastFetchOk = extracted.length > 0;
    }
  } catch (e) {
    part.lastFetchOk = false;
  }
  part.lastFetchedAt = new Date().toISOString();
}

export async function syncSingleSourceLogic(source, settings, env, mode) {
  const isAuto = mode === "auto";
  const now = Date.now();
  source.parts = source.parts || [];
  let anyPartFetched = false;
  for (const part of source.parts) {
    if (part.kind !== "url" || !part.url) continue;
    if (isAuto) {
      if (part.autoRefreshEnabled === false) continue;
      const intervalMs = clampAutoRefreshMinutes(part.autoRefreshMinutes) * 60 * 1000;
      const lastFetchedAt = part.lastFetchedAt ? new Date(part.lastFetchedAt).getTime() : 0;
      if (now - lastFetchedAt < intervalMs) continue;
    }
    await fetchAndPopulatePart(part, true);
    anyPartFetched = true;
  }
  if (isAuto && !anyPartFetched) return false;
  assignSequentialNames(source);
  await regenerateSourceOutput(source, settings, env);
  source.lastSync = new Date().toISOString();
  return true;
}

export async function regenerateAllSourceOutputs(env) {
  const sources = await getSources(env);
  const settings = await getSettings(env);
  for (const source of sources) {
    await regenerateSourceOutput(source, settings, env);
  }
}

export async function processAllSubscriptions(env, options) {
  const mode = (options && options.mode) || "manual";
  const sources = await getSources(env);
  const settings = await getSettings(env);
  let anyChanged = false;
  for (const source of sources) {
    const changed = await syncSingleSourceLogic(source, settings, env, mode);
    if (changed) anyChanged = true;
  }
  if (anyChanged) await saveSources(sources, env);
}
