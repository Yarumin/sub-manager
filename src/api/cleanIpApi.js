import { MAX_CLEAN_IPS_PER_LIST, MAX_CLEAN_IP_LISTS, BUILTIN_CLEAN_IP_LIST_ID } from "../constants.js";
import { shortId } from "../utils/ids.js";
import { getSettings, saveSettings } from "../storage/kvStore.js";
import { regenerateAllSourceOutputs } from "../sync/syncEngine.js";

export async function handleAddCleanIpList(request, env) {
  try {
    const data = await request.json();
    const name = (data.name || "").trim();
    const ips = Array.isArray(data.ips) ? data.ips.map((i) => (i || "").trim()).filter(Boolean) : [];
    if (!name) return new Response(JSON.stringify({ success: false, error: "LIST_NAME_REQUIRED" }), { status: 400 });
    if (ips.length === 0) return new Response(JSON.stringify({ success: false, error: "LIST_NEEDS_ONE_IP" }), { status: 400 });
    if (ips.length > MAX_CLEAN_IPS_PER_LIST) {
      return new Response(JSON.stringify({ success: false, error: "LIST_MAX_IPS", errorParams: { limit: MAX_CLEAN_IPS_PER_LIST } }), { status: 400 });
    }
    const settings = await getSettings(env);
    if (settings.cleanIpLists.length >= MAX_CLEAN_IP_LISTS) {
      return new Response(JSON.stringify({ success: false, error: "LIST_MAX_LISTS", errorParams: { limit: MAX_CLEAN_IP_LISTS } }), { status: 400 });
    }
    settings.cleanIpLists.push({ id: shortId(), name, ips, builtin: false });
    await saveSettings(settings, env);
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "LIST_ADD_FAILED" }), { status: 500 });
  }
}

export async function handleUpdateCleanIpList(listId, request, env, ctx) {
  try {
    const data = await request.json();
    const settings = await getSettings(env);
    const list = settings.cleanIpLists.find((l) => l.id === listId);
    if (!list) return new Response(JSON.stringify({ success: false, error: "LIST_NOT_FOUND" }), { status: 404 });
    if (typeof data.name === "string" && data.name.trim()) list.name = data.name.trim();
    if (Array.isArray(data.ips)) {
      const ips = data.ips.map((i) => (i || "").trim()).filter(Boolean);
      if (ips.length > MAX_CLEAN_IPS_PER_LIST) {
        return new Response(JSON.stringify({ success: false, error: "LIST_MAX_IPS", errorParams: { limit: MAX_CLEAN_IPS_PER_LIST } }), { status: 400 });
      }
      list.ips = ips;
    }
    await saveSettings(settings, env);
    if (ctx && ctx.waitUntil) ctx.waitUntil(regenerateAllSourceOutputs(env));
    else await regenerateAllSourceOutputs(env);
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "LIST_UPDATE_FAILED" }), { status: 500 });
  }
}

export async function handleDeleteCleanIpList(listId, env, ctx) {
  if (listId === BUILTIN_CLEAN_IP_LIST_ID) {
    return new Response(JSON.stringify({ success: false, error: "LIST_DEFAULT_UNDELETABLE" }), { status: 400 });
  }
  try {
    const settings = await getSettings(env);
    settings.cleanIpLists = settings.cleanIpLists.filter((l) => l.id !== listId);
    await saveSettings(settings, env);
    if (ctx && ctx.waitUntil) ctx.waitUntil(regenerateAllSourceOutputs(env));
    else await regenerateAllSourceOutputs(env);
    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "LIST_DELETE_FAILED" }), { status: 500 });
  }
}
