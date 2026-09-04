import { handleGetState } from "./stateApi.js";
import { handleAddCleanIpList, handleUpdateCleanIpList, handleDeleteCleanIpList } from "./cleanIpApi.js";
import { handleAddSource, handleDeleteSource, handleUpdateSourceSlug } from "./sourcesApi.js";
import { handleUpdatePartSettings, handleDeletePartFromSource, handleSyncOneSource, handleGetSourceConfigs } from "./partsApi.js";
import {
  handleAddConfigToPart,
  handleReorderPartConfigs,
  handleBatchUpdatePartConfigs,
  handleToggleBlockConfig,
  handleBulkSetConfigsIncluded,
  handleSetConfigCustomName,
  handleDeleteConfigFromPart
} from "./configsApi.js";
import {
  handleAddCfConnection,
  handleDeleteCfConnection,
  handleGetCloudflareStats,
  handleListCfScripts,
  handleGetCfRegions,
  handleGetCfScriptSettings,
  handleSetCfPlacement
} from "./cfConnectionApi.js";
import { handleExportBackup, handleImportBackup } from "../storage/backupHandlers.js";
import { processAllSubscriptions } from "../sync/syncEngine.js";

export async function handleApi(parts, request, env, ctx) {
  const method = request.method;

  if (parts.length === 2 && parts[1] === "state" && method === "GET") return await handleGetState(env);

  if (parts.length === 2 && parts[1] === "clean-ip-lists" && method === "POST") return await handleAddCleanIpList(request, env);
  if (parts.length === 3 && parts[1] === "clean-ip-lists" && method === "PUT") return await handleUpdateCleanIpList(parts[2], request, env, ctx);
  if (parts.length === 3 && parts[1] === "clean-ip-lists" && method === "DELETE") return await handleDeleteCleanIpList(parts[2], env, ctx);

  if (parts.length === 2 && parts[1] === "sources" && method === "POST") return await handleAddSource(request, env);
  if (parts.length === 3 && parts[1] === "sources" && method === "DELETE") return await handleDeleteSource(parts[2], env);
  if (parts.length === 4 && parts[1] === "sources" && parts[3] === "slug" && method === "PUT") return await handleUpdateSourceSlug(parts[2], request, env);
  if (parts.length === 4 && parts[1] === "sources" && parts[3] === "sync" && method === "POST") return await handleSyncOneSource(parts[2], env);
  if (parts.length === 4 && parts[1] === "sources" && parts[3] === "configs" && method === "GET") return await handleGetSourceConfigs(parts[2], env);

  if (parts.length === 5 && parts[1] === "sources" && parts[3] === "parts" && method === "PUT") return await handleUpdatePartSettings(parts[2], parts[4], request, env);
  if (parts.length === 5 && parts[1] === "sources" && parts[3] === "parts" && method === "DELETE") return await handleDeletePartFromSource(parts[2], parts[4], env);

  if (parts.length === 6 && parts[1] === "sources" && parts[3] === "parts" && parts[5] === "configs" && method === "POST") {
    return await handleAddConfigToPart(parts[2], parts[4], request, env);
  }
  if (parts.length === 7 && parts[1] === "sources" && parts[3] === "parts" && parts[5] === "configs" && parts[6] === "order" && method === "PUT") {
    return await handleReorderPartConfigs(parts[2], parts[4], request, env);
  }
  if (parts.length === 7 && parts[1] === "sources" && parts[3] === "parts" && parts[5] === "configs" && parts[6] === "batch" && method === "PUT") {
    return await handleBatchUpdatePartConfigs(parts[2], parts[4], request, env);
  }
  if (parts.length === 8 && parts[1] === "sources" && parts[3] === "parts" && parts[5] === "configs" && parts[7] === "block" && method === "PUT") {
    return await handleToggleBlockConfig(parts[2], parts[4], parts[6], env);
  }
  if (parts.length === 7 && parts[1] === "sources" && parts[3] === "parts" && parts[5] === "configs" && parts[6] === "select-all" && method === "PUT") {
    return await handleBulkSetConfigsIncluded(parts[2], parts[4], request, env);
  }
  if (parts.length === 8 && parts[1] === "sources" && parts[3] === "parts" && parts[5] === "configs" && parts[7] === "name" && method === "PUT") {
    return await handleSetConfigCustomName(parts[2], parts[4], parts[6], request, env);
  }
  if (parts.length === 7 && parts[1] === "sources" && parts[3] === "parts" && parts[5] === "configs" && method === "DELETE") {
    return await handleDeleteConfigFromPart(parts[2], parts[4], parts[6], env);
  }

  if (parts.length === 2 && parts[1] === "sync" && method === "POST") {
    await processAllSubscriptions(env);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  if (parts.length === 2 && parts[1] === "cf-connections" && method === "POST") return await handleAddCfConnection(request, env);
  if (parts.length === 3 && parts[1] === "cf-connections" && method === "DELETE") return await handleDeleteCfConnection(parts[2], env);
  if (parts.length === 4 && parts[1] === "cf-connections" && parts[3] === "stats" && method === "GET") return await handleGetCloudflareStats(parts[2], env);
  if (parts.length === 4 && parts[1] === "cf-connections" && parts[3] === "scripts" && method === "GET") return await handleListCfScripts(parts[2], env);
  if (parts.length === 4 && parts[1] === "cf-connections" && parts[3] === "regions" && method === "GET") return await handleGetCfRegions(parts[2], env);
  if (parts.length === 5 && parts[1] === "cf-connections" && parts[3] === "script-settings" && method === "GET") return await handleGetCfScriptSettings(parts[2], decodeURIComponent(parts[4]), env);
  if (parts.length === 4 && parts[1] === "cf-connections" && parts[3] === "placement" && method === "PUT") return await handleSetCfPlacement(parts[2], request, env);

  if (parts.length === 2 && parts[1] === "backup" && method === "GET") return await handleExportBackup(env, request);
  if (parts.length === 2 && parts[1] === "backup" && method === "POST") return await handleImportBackup(request, env, ctx);

  return new Response("Not Found", { status: 404 });
}
