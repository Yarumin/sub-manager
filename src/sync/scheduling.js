import { DEFAULT_AUTO_REFRESH_MINUTES } from "../constants.js";
import { clampAutoRefreshMinutes } from "../storage/kvStore.js";
import { generateSourceOutput } from "../configEngine/output.js";

export function computeNextAutoRefreshDueAt(source) {
  let earliest = null;
  (source.parts || []).forEach((part) => {
    if (part.kind !== "url" || part.autoRefreshEnabled === false) return;
    const intervalMs = clampAutoRefreshMinutes(part.autoRefreshMinutes) * 60 * 1000;
    const lastFetchedAt = part.lastFetchedAt ? new Date(part.lastFetchedAt).getTime() : 0;
    const dueAt = lastFetchedAt + intervalMs;
    if (earliest === null || dueAt < earliest) earliest = dueAt;
  });
  return earliest === null ? null : new Date(earliest).toISOString();
}

export function computeSourceUpdateIntervalMinutes(source) {
  let smallest = null;
  (source.parts || []).forEach((part) => {
    if (part.kind !== "url" || part.autoRefreshEnabled === false) return;
    const minutes = clampAutoRefreshMinutes(part.autoRefreshMinutes);
    if (smallest === null || minutes < smallest) smallest = minutes;
  });
  return smallest === null ? DEFAULT_AUTO_REFRESH_MINUTES : smallest;
}

export async function regenerateSourceOutput(source, settings, env) {
  const result = generateSourceOutput(source, settings);
  const configsText = (result.configs || []).join("\n");
  const usagePercentTargets = result.usagePercentTargets || {};
  const hasLiveTargets = Object.keys(usagePercentTargets).length > 0;
  const outputData = {
    id: source.id,
    name: source.name,
    updatedAt: new Date().toISOString(),
    configs: configsText,
    // Pre-encoded once here at generation time rather than on every single
    // subscription request. Only possible when there is nothing left to
    // substitute live at serve time (no usage-percent sentinels); otherwise
    // this is left null and publicApi/serveSubscription.js falls back to
    // encoding after doing the live substitution.
    base64Configs: hasLiveTargets ? null : btoa(unescape(encodeURIComponent(configsText))),
    partWarnings: result.partWarnings || [],
    nextAutoRefreshDueAt: computeNextAutoRefreshDueAt(source),
    updateIntervalMinutes: computeSourceUpdateIntervalMinutes(source),
    // Per-part map of which Cloudflare connection+script (if any) each
    // part's live usage-percentage sentinel in `configs` above should be
    // resolved against. Travels with the cache so the public /sub/{slug}
    // path never needs to load the full source object just to serve a
    // request.
    usagePercentTargets: hasLiveTargets ? usagePercentTargets : null
  };
  try {
    await env.SUB_DB.put(`out_${source.id}`, JSON.stringify(outputData));
  } catch (e) {
    /* KV write failed - the next successful sync will overwrite this anyway */
  }
}
