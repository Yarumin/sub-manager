import { DEFAULT_AUTO_REFRESH_MINUTES } from "../constants.js";
import { getSources, saveSources, getSettings } from "../storage/kvStore.js";
import { syncSingleSourceLogic } from "../sync/syncEngine.js";

export async function resolveSourceIdFromToken(token, env) {
  const indexed = await env.SUB_DB.get(`slugidx_${token}`);
  if (indexed) return indexed;
  const sources = await getSources(env);
  const legacyMatch = sources.find((s) => s.id === token && s.slug === token);
  if (!legacyMatch) return null;
  try {
    await env.SUB_DB.put(`slugidx_${token}`, token);
  } catch (e) {
    /* index write failed - resolution still works via legacy fallback next time */
  }
  return token;
}

export async function handleServeSubscription(token, env, ctx) {
  if (!token) return new Response("Subscription Not Found", { status: 404 });
  const id = await resolveSourceIdFromToken(token, env);
  if (!id) return new Response("Subscription Not Found", { status: 404 });
  const dataStr = await env.SUB_DB.get(`out_${id}`);
  if (!dataStr) return new Response("Subscription Not Found", { status: 404 });
  try {
    const data = JSON.parse(dataStr);
    if (data.nextAutoRefreshDueAt && Date.now() > new Date(data.nextAutoRefreshDueAt).getTime()) {
      ctx.waitUntil(backgroundRefreshOneSource(id, env));
    }
    const base64Configs = btoa(unescape(encodeURIComponent(data.configs || "")));
    const updateIntervalHours = Math.max(1, Math.round((data.updateIntervalMinutes || DEFAULT_AUTO_REFRESH_MINUTES) / 60));
    return new Response(base64Configs, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Profile-Title": "base64:" + btoa(unescape(encodeURIComponent(data.name || "AutoSub"))),
        "Profile-Update-Interval": String(updateIntervalHours),
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    return new Response("Subscription data corrupted", { status: 500 });
  }
}

export async function backgroundRefreshOneSource(id, env) {
  try {
    const sources = await getSources(env);
    const source = sources.find((s) => s.id === id);
    if (!source) return;
    const settings = await getSettings(env);
    const changed = await syncSingleSourceLogic(source, settings, env, "auto");
    if (changed) await saveSources(sources, env);
  } catch (e) {
    /* background refresh failed silently - the next request retries */
  }
}
