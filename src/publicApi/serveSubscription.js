import { DEFAULT_AUTO_REFRESH_MINUTES, USAGE_PERCENT_SENTINEL, USAGE_PERCENT_CACHE_SECONDS, WORKER_FREE_DAILY_LIMIT } from "../constants.js";
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

// v1.1.0: fetches (and briefly caches) how much of the free daily invocation
// limit a specific Worker script has used, so it can be spliced into config
// names as "(NN%)". This is intentionally NOT tied to the source's own
// lazy auto-refresh interval (the admin can wait up to 24h for source
// content to refresh, but wants the usage number close to real-time) - a
// short KV cache is used only to avoid hammering Cloudflare's GraphQL API
// and slowing down every single client subscription request.
async function getCachedUsagePercent(target, env) {
  const cacheKey = `usagepct_${target.cfConnectionId}_${target.scriptName}`;
  try {
    const cached = await env.SUB_DB.get(cacheKey);
    if (cached !== null) return cached;
  } catch (e) {
    /* cache read failed - fall through to a live fetch */
  }
  const percent = await fetchLiveUsagePercent(target, env);
  if (percent !== null) {
    try {
      await env.SUB_DB.put(cacheKey, String(percent), { expirationTtl: USAGE_PERCENT_CACHE_SECONDS });
    } catch (e) {
      /* cache write failed - not fatal, next request just fetches live again */
    }
  }
  return percent === null ? null : String(percent);
}

async function fetchLiveUsagePercent(target, env) {
  try {
    const settings = await getSettings(env);
    const conn = (settings.cfConnections || []).find((c) => c.id === target.cfConnectionId);
    if (!conn || !conn.accountId || !conn.apiToken) return null;
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const query = `query { viewer { accounts(filter: {accountTag: "${conn.accountId}"}) { workersInvocationsAdaptive(limit: 1, filter: {scriptName: "${target.scriptName}", datetime_geq: "${startOfDay.toISOString()}", datetime_lt: "${endOfDay.toISOString()}"}) { sum { requests } } } } }`;
    const resp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${conn.apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    if (!resp.ok) return null;
    const json = await resp.json().catch(() => null);
    if (!json || json.errors) return null;
    const accounts = json.data && json.data.viewer && json.data.viewer.accounts;
    const sum = accounts && accounts[0] && accounts[0].workersInvocationsAdaptive && accounts[0].workersInvocationsAdaptive[0] && accounts[0].workersInvocationsAdaptive[0].sum;
    if (!sum) return null;
    const percent = Math.min(999, Math.round((sum.requests / WORKER_FREE_DAILY_LIMIT) * 100));
    return percent;
  } catch (e) {
    return null;
  }
}

async function injectUsagePercent(configs, usagePercentTarget, env) {
  if (!usagePercentTarget || !configs.includes(USAGE_PERCENT_SENTINEL)) return configs;
  const percent = await getCachedUsagePercent(usagePercentTarget, env);
  // If the live fetch fails for any reason, fall back to "--" rather than
  // breaking the whole subscription output.
  const replacement = percent === null ? "--" : percent;
  return configs.split(USAGE_PERCENT_SENTINEL).join(replacement);
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
      // The cached configs below are still served immediately (no delay for
      // the client); the source is refreshed in the background for next time.
      ctx.waitUntil(backgroundRefreshOneSource(id, env));
    }
    const liveConfigs = await injectUsagePercent(data.configs || "", data.usagePercentTarget, env);
    const base64Configs = btoa(unescape(encodeURIComponent(liveConfigs)));
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
