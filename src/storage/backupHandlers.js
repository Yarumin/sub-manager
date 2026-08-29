import { BUILTIN_CLEAN_IP_LIST_ID, DEFAULT_CLEAN_IPS } from "../constants.js";
import { makeSlug } from "../utils/ids.js";
import { getSources, saveSources, getSettings, saveSettings } from "./kvStore.js";
import { regenerateSourceOutput } from "../sync/scheduling.js";
import { BACKUP_SECTION_KEYS, buildBackupData, normalizeImportedBackup } from "./backupCore.js";

export async function handleExportBackup(env, request) {
  try {
    const url = new URL(request.url);
    const requested = (url.searchParams.get("sections") || "").split(",").map((s) => s.trim()).filter(Boolean);
    const sections = new Set(requested.filter((s) => BACKUP_SECTION_KEYS.includes(s)));
    if (sections.size === 0) BACKUP_SECTION_KEYS.forEach((k) => sections.add(k));
    const backup = await buildBackupData(env, sections);
    return new Response(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="sub-manager-backup-${new Date().toISOString().slice(0, 10)}.json"`
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "EXPORT_FAILED" }), { status: 500 });
  }
}

export async function handleImportBackup(request, env, ctx) {
  try {
    const raw = await request.json();
    const mode = raw && raw.__importMode === "merge" ? "merge" : "replace";
    const requestedSections =
      Array.isArray(raw && raw.__importSections) && raw.__importSections.length > 0
        ? new Set(raw.__importSections.filter((s) => BACKUP_SECTION_KEYS.includes(s)))
        : new Set(BACKUP_SECTION_KEYS);
    const sectionsInFile = Array.isArray(raw && raw.sectionsIncluded)
      ? new Set(raw.sectionsIncluded.filter((s) => BACKUP_SECTION_KEYS.includes(s)))
      : new Set(BACKUP_SECTION_KEYS);
    const importSources = requestedSections.has("sources") && sectionsInFile.has("sources");
    const importCleanIpLists = requestedSections.has("cleanIpLists") && sectionsInFile.has("cleanIpLists");
    const importCfConnections = requestedSections.has("cfConnections") && sectionsInFile.has("cfConnections");

    const normalized = normalizeImportedBackup(raw);
    const existingSources = await getSources(env);
    const existingSettings = await getSettings(env);

    let finalSources = existingSources;
    let sourcesToRegenerate = [];
    // Old slug per source id, captured before any of this import's changes
    // are applied - used below to detect and clean up slug index entries
    // that would otherwise be orphaned when a *retained* source id comes
    // back from the backup under a different slug (replace mode only;
    // merge mode never touches an existing source's identity).
    const oldSlugById = new Map(existingSources.map((s) => [s.id, s.slug]));

    if (importSources) {
      if (mode === "replace") {
        finalSources = normalized.sources;
        sourcesToRegenerate = normalized.sources;
      } else {
        const existingIds = new Set(existingSources.map((s) => s.id));
        const toAdd = normalized.sources.filter((s) => !existingIds.has(s.id));
        finalSources = existingSources.concat(toAdd);
        sourcesToRegenerate = toAdd;
      }
    }

    let finalCleanIpLists = existingSettings.cleanIpLists;
    let listsImportedCount = 0;
    if (importCleanIpLists) {
      if (mode === "replace") {
        finalCleanIpLists = normalized.settings.cleanIpLists;
        listsImportedCount = finalCleanIpLists.filter((l) => l.id !== BUILTIN_CLEAN_IP_LIST_ID).length;
      } else {
        const existingListIds = new Set(existingSettings.cleanIpLists.map((l) => l.id));
        const listsToAdd = normalized.settings.cleanIpLists.filter(
          (l) => !existingListIds.has(l.id) && l.id !== BUILTIN_CLEAN_IP_LIST_ID
        );
        finalCleanIpLists = existingSettings.cleanIpLists.concat(listsToAdd);
        listsImportedCount = listsToAdd.length;
      }
    }
    if (!finalCleanIpLists.some((l) => l.id === BUILTIN_CLEAN_IP_LIST_ID)) {
      finalCleanIpLists = [
        { id: BUILTIN_CLEAN_IP_LIST_ID, name: "لیست پیش‌فرض پنل", ips: DEFAULT_CLEAN_IPS.slice(), builtin: true }
      ].concat(finalCleanIpLists);
    }

    let finalCfConnections = existingSettings.cfConnections;
    let cfImportedCount = 0;
    if (importCfConnections) {
      if (mode === "replace") {
        finalCfConnections = normalized.settings.cfConnections;
        cfImportedCount = finalCfConnections.length;
      } else {
        const existingConnIds = new Set(existingSettings.cfConnections.map((c) => c.id));
        const cfToAdd = normalized.settings.cfConnections.filter((c) => !existingConnIds.has(c.id));
        finalCfConnections = existingSettings.cfConnections.concat(cfToAdd);
        cfImportedCount = cfToAdd.length;
      }
    }

    const finalSettings = { cleanIpLists: finalCleanIpLists, cfConnections: finalCfConnections };
    let staleSlugsToDelete = [];

    if (importSources) {
      const seenSlugs = new Set();
      finalSources.forEach((source) => {
        if (!source.slug || seenSlugs.has(source.slug)) {
          let candidate = makeSlug();
          while (seenSlugs.has(candidate)) candidate = makeSlug();
          source.slug = candidate;
        }
        seenSlugs.add(source.slug);
      });

      if (mode === "replace") {
        const newIds = new Set(finalSources.map((s) => s.id));
        const removed = existingSources.filter((s) => !newIds.has(s.id));
        for (const s of removed) {
          await env.SUB_DB.delete(`out_${s.id}`);
          if (s.slug) await env.SUB_DB.delete(`slugidx_${s.slug}`);
        }
        // A source id that survives the replace can still have arrived
        // with a different slug than it had before (the backup file is
        // the source of truth for slugs in replace mode) - without this,
        // the previous slug's index entry keeps resolving to this source
        // forever, so the "old" subscription link never actually retires.
        staleSlugsToDelete = finalSources
          .filter((s) => oldSlugById.has(s.id) && oldSlugById.get(s.id) && oldSlugById.get(s.id) !== s.slug)
          .map((s) => oldSlugById.get(s.id));
      }
    }

    await saveSources(finalSources, env);
    await saveSettings(finalSettings, env);

    if (importSources) {
      for (const staleSlug of staleSlugsToDelete) {
        await env.SUB_DB.delete(`slugidx_${staleSlug}`);
      }
      for (const source of finalSources) {
        await env.SUB_DB.put(`slugidx_${source.slug}`, source.id);
      }
      for (const source of sourcesToRegenerate) {
        await regenerateSourceOutput(source, finalSettings, env);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sourcesImported: sourcesToRegenerate.length,
        listsImported: listsImportedCount,
        cfConnectionsImported: cfImportedCount
      })
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "IMPORT_INVALID_BACKUP" }), { status: 400 });
  }
}
