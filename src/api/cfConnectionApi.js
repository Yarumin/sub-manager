import { shortId } from "../utils/ids.js";
import { getSettings, saveSettings } from "../storage/kvStore.js";

export async function validateCfConnection(accountId, apiToken) {
  if (!accountId || !apiToken) return { ok: false, error: "CF_CREDENTIALS_REQUIRED" };
  try {
    const verifyResp = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    const verifyJson = await verifyResp.json().catch(() => null);
    if (!verifyResp.ok || !verifyJson || verifyJson.success !== true) return { ok: false, error: "CF_TOKEN_INVALID" };
    const acctResp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}`, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    const acctJson = await acctResp.json().catch(() => null);
    if (!acctResp.ok || !acctJson || acctJson.success !== true) return { ok: false, error: "CF_ACCOUNT_MISMATCH" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "CF_VALIDATION_FAILED" };
  }
}

export async function handleAddCfConnection(request, env) {
  try {
    const data = await request.json();
    const label = (data.label || "").trim() || "اکانت کلودفلر";
    const accountId = (data.accountId || "").trim();
    const apiToken = (data.apiToken || "").trim();
    const validation = await validateCfConnection(accountId, apiToken);
    if (!validation.ok) return new Response(JSON.stringify({ success: false, error: validation.error }), { status: 400 });
    const settings = await getSettings(env);
    settings.cfConnections.push({ id: shortId(), label, accountId, apiToken });
    await saveSettings(settings, env);
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CF_CONNECTION_ADD_FAILED" }), { status: 500 });
  }
}

export async function handleDeleteCfConnection(connectionId, env) {
  try {
    const settings = await getSettings(env);
    settings.cfConnections = settings.cfConnections.filter((c) => c.id !== connectionId);
    await saveSettings(settings, env);
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CF_CONNECTION_DELETE_FAILED" }), { status: 500 });
  }
}

export async function handleGetCloudflareStats(connectionId, env) {
  const settings = await getSettings(env);
  const conn = settings.cfConnections.find((c) => c.id === connectionId);
  if (!conn) return new Response(JSON.stringify({ error: "این اتصال API یافت نشد." }), { status: 404 });
  if (!/^[a-f0-9]{32}$/i.test(conn.accountId || "")) {
    return new Response(JSON.stringify({ error: "Account ID این اتصال نامعتبر است." }), { status: 400 });
  }
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const query = `query { viewer { accounts(filter: {accountTag: "${conn.accountId}"}) { workersInvocationsAdaptive(limit: 1, filter: {datetime_geq: "${startOfDay.toISOString()}", datetime_lt: "${endOfDay.toISOString()}"}) { sum { requests } } } } }`;
  try {
    const resp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${conn.apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json || json.errors) {
      const message = (json && json.errors && json.errors[0] && json.errors[0].message) || "دریافت آمار از کلودفلر ناموفق بود";
      return new Response(JSON.stringify({ error: message }), { status: 502 });
    }
    const accounts = json.data && json.data.viewer && json.data.viewer.accounts;
    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ error: "این توکن به اطلاعات آماری این اکانت دسترسی ندارد." }), { status: 403 });
    }
    const stats = (accounts[0].workersInvocationsAdaptive && accounts[0].workersInvocationsAdaptive[0] && accounts[0].workersInvocationsAdaptive[0].sum) || { requests: 0 };
    return new Response(JSON.stringify({ requests: stats.requests, label: conn.label }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "اتصال به کلودفلر برقرار نشد." }), { status: 500 });
  }
}
