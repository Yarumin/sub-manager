import { DEFAULT_AUTO_REFRESH_MINUTES, USAGE_PERCENT_SENTINEL, USAGE_PERCENT_CACHE_SECONDS, WORKER_FREE_DAILY_LIMIT, REFRESH_LOCK_TTL_SECONDS } from "../constants.js";
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
// and slowing down every single client subscription request. Never
// consulted by the admin panel's own sync actions, which always fetch live.
async function getCachedUsagePercent(target, env) {
  const kvKey = `usagepct_${target.cfConnectionId}_${target.scriptName}`;
  try {
    const cached = await env.SUB_DB.get(kvKey);
    if (cached !== null) return cached;
  } catch (e) {
    /* KV cache read failed - fall through to a live fetch */
  }

  const percent = await fetchLiveUsagePercent(target, env);
  if (percent !== null) {
    const percentStr = String(percent);
    try {
      await env.SUB_DB.put(kvKey, percentStr, { expirationTtl: USAGE_PERCENT_CACHE_SECONDS });
    } catch (e) {
      /* KV cache write failed - not fatal, next request just fetches live again */
    }
    return percentStr;
  }
  return null;
}

async function fetchLiveUsagePercent(target, env) {
  try {
    const settings = await getSettings(env);
    const conn = (settings.cfConnections || []).find((c) => c.id === target.cfConnectionId);
    if (!conn || !conn.accountId || !conn.apiToken) return null;
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const query = `query($accountTag: string!, $scriptName: string!, $datetimeGeq: string!, $datetimeLt: string!) {
      viewer {
        accounts(filter: {accountTag: $accountTag}) {
          workersInvocationsAdaptive(limit: 1, filter: {scriptName: $scriptName, datetime_geq: $datetimeGeq, datetime_lt: $datetimeLt}) {
            sum { requests }
          }
        }
      }
    }`;
    const variables = {
      accountTag: conn.accountId,
      scriptName: target.scriptName,
      datetimeGeq: startOfDay.toISOString(),
      datetimeLt: endOfDay.toISOString()
    };
    const resp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${conn.apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables })
    });
    if (!resp.ok) return null;
    const json = await resp.json().catch(() => null);
    if (!json || json.errors) return null;
    const accounts = json.data && json.data.viewer && json.data.viewer.accounts;
    // Missing `accounts` entirely means the token/account lookup itself
    // failed - a genuine error, so this returns null (falls back to "--").
    if (!accounts) return null;
    // Cloudflare's Analytics API returns an EMPTY array (not a row with
    // requests: 0) when a script genuinely had zero invocations in the
    // queried window - so a missing row here means "0 requests", not "fetch
    // failed". Treating it as a failure was the actual cause of showing
    // "--%" for workers that legitimately had 0% usage.
    const sum = (accounts[0] && accounts[0].workersInvocationsAdaptive && accounts[0].workersInvocationsAdaptive[0] && accounts[0].workersInvocationsAdaptive[0].sum) || { requests: 0 };
    const percent = Math.min(999, Math.round((sum.requests / WORKER_FREE_DAILY_LIMIT) * 100));
    return percent;
  } catch (e) {
    return null;
  }
}

async function injectUsagePercent(configs, usagePercentTargets, env) {
  if (!usagePercentTargets || !configs.includes(USAGE_PERCENT_SENTINEL)) return configs;
  let result = configs;
  for (const partId of Object.keys(usagePercentTargets)) {
    const sentinel = USAGE_PERCENT_SENTINEL + partId;
    if (!result.includes(sentinel)) continue;
    const percent = await getCachedUsagePercent(usagePercentTargets[partId], env);
    // If the live fetch fails for any reason, fall back to "--" rather than
    // breaking the whole subscription output.
    const replacement = percent === null ? "--" : percent;
    result = result.split(sentinel).join(replacement);
  }
  return result;
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
      // the client); the source is refreshed in the background for next
      // time. Guarded by a short-lived KV lock so many clients hitting this
      // at once don't each trigger their own background refresh.
      ctx.waitUntil(triggerBackgroundRefreshOnce(id, env));
    }
    // Already base64-encoded at generation time when possible (see
    // sync/scheduling.js) - only re-encode here when a live usage-percent
    // value still needs to be spliced in first.
    const base64Configs = data.base64Configs
      ? data.base64Configs
      : btoa(unescape(encodeURIComponent(await injectUsagePercent(data.configs || "", data.usagePercentTargets, env))));
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

// Several clients can hit a due-for-refresh subscription within the same
// few seconds; without this lock each one would independently trigger
// backgroundRefreshOneSource, multiplying requests to the source's upstream
// links and to Cloudflare's API for no benefit.
async function triggerBackgroundRefreshOnce(id, env) {
  const lockKey = `refresh_lock_${id}`;
  try {
    const existing = await env.SUB_DB.get(lockKey);
    if (existing) return;
    await env.SUB_DB.put(lockKey, "1", { expirationTtl: REFRESH_LOCK_TTL_SECONDS });
  } catch (e) {
    /* lock read/write failed - proceed anyway rather than never refreshing */
  }
  await backgroundRefreshOneSource(id, env);
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
