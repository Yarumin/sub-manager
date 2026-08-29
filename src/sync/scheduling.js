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
  const outputData = {
    id: source.id,
    name: source.name,
    updatedAt: new Date().toISOString(),
    configs: (result.configs || []).join("\n"),
    partWarnings: result.partWarnings || [],
    nextAutoRefreshDueAt: computeNextAutoRefreshDueAt(source),
    updateIntervalMinutes: computeSourceUpdateIntervalMinutes(source)
  };
  try {
    await env.SUB_DB.put(`out_${source.id}`, JSON.stringify(outputData));
  } catch (e) {
    /* KV write failed - the next successful sync will overwrite this anyway */
  }
}
