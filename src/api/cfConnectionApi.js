import { shortId } from "../utils/ids.js";
import { getSettings, saveSettings } from "../storage/kvStore.js";

// v1.1.0: the Cloudflare "Create Token" success screen shows both the
// Account ID and the token side by side, both a single click to copy - so
// there is no real time savings left in trying to auto-detect the account
// from the token alone (and doing so needs the extra "Account Settings"
// permission for no benefit). The panel simply asks for both, exactly as
// Cloudflare presents them, and verifies the pair together in one call.
async function verifyCfAccount(apiToken, accountId) {
  const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}`, {
    headers: { Authorization: `Bearer ${apiToken}` }
  });
  const json = await resp.json().catch(() => null);
  if (!resp.ok || !json || json.success !== true || !json.result) return null;
  return { id: json.result.id, name: json.result.name || json.result.id };
}

export async function handleAddCfConnection(request, env) {
  try {
    const data = await request.json();
    const label = (data.label || "").trim() || "اکانت کلودفلر";
    const apiToken = (data.apiToken || "").trim();
    const accountId = (data.accountId || "").trim();
    if (!apiToken || !accountId) return new Response(JSON.stringify({ success: false, error: "CF_CREDENTIALS_REQUIRED" }), { status: 400 });

    const account = await verifyCfAccount(apiToken, accountId);
    if (!account) return new Response(JSON.stringify({ success: false, error: "CF_TOKEN_INVALID" }), { status: 400 });

    const settings = await getSettings(env);
    settings.cfConnections.push({
      id: shortId(),
      label,
      accountId: account.id,
      accountName: account.name,
      apiToken
    });
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
  if (!conn) return new Response(JSON.stringify({ success: false, error: "CF_CONNECTION_NOT_FOUND" }), { status: 404 });
  if (!/^[a-f0-9]{32}$/i.test(conn.accountId || "")) {
    return new Response(JSON.stringify({ success: false, error: "CF_ACCOUNT_ID_INVALID" }), { status: 400 });
  }
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const query = `query($accountTag: string!, $datetimeGeq: string!, $datetimeLt: string!) {
    viewer {
      accounts(filter: {accountTag: $accountTag}) {
        workersInvocationsAdaptive(limit: 1, filter: {datetime_geq: $datetimeGeq, datetime_lt: $datetimeLt}) {
          sum { requests }
        }
      }
    }
  }`;
  const variables = { accountTag: conn.accountId, datetimeGeq: startOfDay.toISOString(), datetimeLt: endOfDay.toISOString() };
  try {
    const resp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${conn.apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables })
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json || json.errors) {
      const message = (json && json.errors && json.errors[0] && json.errors[0].message) || null;
      return new Response(JSON.stringify({ success: false, error: "CF_STATS_FETCH_FAILED", message }), { status: 502 });
    }
    const accounts = json.data && json.data.viewer && json.data.viewer.accounts;
    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "CF_STATS_NO_ACCESS" }), { status: 403 });
    }
    const stats = (accounts[0].workersInvocationsAdaptive && accounts[0].workersInvocationsAdaptive[0] && accounts[0].workersInvocationsAdaptive[0].sum) || { requests: 0 };
    return new Response(JSON.stringify({ success: true, requests: stats.requests, label: conn.label }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CF_STATS_FETCH_FAILED" }), { status: 500 });
  }
}

// v1.1.0: list the account's Worker scripts, so the panel can offer a
// dropdown instead of asking the user to type a script name from memory.
// Requires the connection's token to have "Workers Scripts" (Edit or Read).
export async function handleListCfScripts(connectionId, env) {
  const settings = await getSettings(env);
  const conn = settings.cfConnections.find((c) => c.id === connectionId);
  if (!conn) return new Response(JSON.stringify({ success: false, error: "CF_CONNECTION_NOT_FOUND" }), { status: 404 });
  try {
    const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(conn.accountId)}/workers/scripts`, {
      headers: { Authorization: `Bearer ${conn.apiToken}` }
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json || json.success !== true) {
      const message = (json && json.errors && json.errors[0] && json.errors[0].message) || null;
      return new Response(JSON.stringify({ success: false, error: "CF_SCRIPTS_LIST_FAILED", message }), { status: 502 });
    }
    const scripts = (json.result || []).map((s) => ({ name: s.id }));
    return new Response(JSON.stringify({ success: true, scripts }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CF_SCRIPTS_LIST_FAILED" }), { status: 500 });
  }
}

// Fetches the full, current list of Placement regions directly from
// Cloudflare (this is a real, documented endpoint - not something inferred
// or guessed). The panel falls back to a small hardcoded preset list
// client-side if this fails, so a token without this permission (or a
// transient API error) doesn't block using Placement at all.
export async function handleGetCfRegions(connectionId, env) {
  const settings = await getSettings(env);
  const conn = settings.cfConnections.find((c) => c.id === connectionId);
  if (!conn) return new Response(JSON.stringify({ success: false, error: "CF_CONNECTION_NOT_FOUND" }), { status: 404 });
  try {
    const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(conn.accountId)}/workers/placement/regions`, {
      headers: { Authorization: `Bearer ${conn.apiToken}` }
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json || json.success !== true) {
      const message = (json && json.errors && json.errors[0] && json.errors[0].message) || null;
      return new Response(JSON.stringify({ success: false, error: "CF_REGIONS_LIST_FAILED", message }), { status: 502 });
    }
    // Real response shape: { result: { providers: [ { id: "aws", regions: [...] }, { id: "gcp", ... }, { id: "azure", ... } ] } }
    // Cloudflare's own OpenAPI spec leaves each region entry untyped
    // ("regions": [null] in the schema), and in practice each entry has
    // turned out to be an object rather than a plain string - handled here
    // by reading whichever of its own fields actually holds the region
    // code, instead of assuming one specific shape.
    const providers = (json.result && json.result.providers) || [];
    const regions = [];
    providers.forEach((p) => {
      (p.regions || []).forEach((entry) => {
        if (!entry) return;
        const regionCode = typeof entry === "string" ? entry : entry.key || entry.name || entry.id || entry.region || entry.code || null;
        if (!regionCode) return;
        regions.push({ value: `${p.id}:${regionCode}`, label: `${p.id.toUpperCase()} - ${regionCode}` });
      });
    });
    return new Response(JSON.stringify({ success: true, regions }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CF_REGIONS_LIST_FAILED" }), { status: 500 });
  }
}

// Reads a Worker's current settings so the panel can show what Placement
// mode is actually in effect right now (rather than just letting the user
// blindly set one) - GET on the same endpoint handleSetCfPlacement PATCHes.
export async function handleGetCfScriptSettings(connectionId, scriptName, env) {
  const settings = await getSettings(env);
  const conn = settings.cfConnections.find((c) => c.id === connectionId);
  if (!conn) return new Response(JSON.stringify({ success: false, error: "CF_CONNECTION_NOT_FOUND" }), { status: 404 });
  try {
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(conn.accountId)}/workers/scripts/${encodeURIComponent(scriptName)}/settings`,
      { headers: { Authorization: `Bearer ${conn.apiToken}` } }
    );
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json || json.success !== true) {
      return new Response(JSON.stringify({ success: false, error: "CF_PLACEMENT_UPDATE_FAILED" }), { status: 502 });
    }
    return new Response(JSON.stringify({ success: true, placement: (json.result && json.result.placement) || null }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CF_PLACEMENT_UPDATE_FAILED" }), { status: 500 });
  }
}

// Sets (or resets) a Worker's Placement, matching the community "region
// hint" trick (Settings > Runtime > Placement > Region in the Cloudflare
// dashboard) - this is a real, documented Cloudflare feature (Placement
// Hints), not a workaround this panel invented.
// Cloudflare's API rejects a literal {mode: "off"} payload ("invalid
// placement mode: off"); an empty placement object ({}) is what actually
// resets it to Default, confirmed against the live API.
export async function handleSetCfPlacement(connectionId, request, env) {
  try {
    const data = await request.json();
    const scriptName = (data.scriptName || "").trim();
    const mode = data.mode === "smart" ? "smart" : data.mode === "off" ? "off" : null;
    const region = typeof data.region === "string" ? data.region.trim() : "";
    if (!scriptName) return new Response(JSON.stringify({ success: false, error: "CF_SCRIPT_NAME_REQUIRED" }), { status: 400 });
    if (!mode && !region) return new Response(JSON.stringify({ success: false, error: "CF_PLACEMENT_INVALID" }), { status: 400 });

    const settings = await getSettings(env);
    const conn = settings.cfConnections.find((c) => c.id === connectionId);
    if (!conn) return new Response(JSON.stringify({ success: false, error: "CF_CONNECTION_NOT_FOUND" }), { status: 404 });

    const placement = region ? { region } : mode === "off" ? {} : { mode };
    // This endpoint only accepts multipart/form-data with a "settings" part
    // (confirmed against real-world Cloudflare API behavior - a JSON body
    // is rejected with "Content-Type must be one of: multipart/form-data").
    // The Content-Type header must NOT be set manually: fetch() needs to
    // generate it itself so it includes the multipart boundary parameter -
    // setting it by hand (even to "multipart/form-data") produces a
    // boundary-less header that Cloudflare also rejects.
    const form = new FormData();
    form.set("settings", JSON.stringify({ placement }));
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(conn.accountId)}/workers/scripts/${encodeURIComponent(scriptName)}/settings`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${conn.apiToken}` },
        body: form
      }
    );
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json || json.success !== true) {
      const message = (json && json.errors && json.errors[0] && json.errors[0].message) || null;
      return new Response(JSON.stringify({ success: false, error: "CF_PLACEMENT_UPDATE_FAILED", message }), { status: 502 });
    }
    return new Response(JSON.stringify({ success: true, placement: (json.result && json.result.placement) || placement }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "CF_PLACEMENT_UPDATE_FAILED" }), { status: 500 });
  }
}
