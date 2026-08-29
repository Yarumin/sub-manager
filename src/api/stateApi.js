import { getSettings, getSources } from "../storage/kvStore.js";

export async function handleGetState(env) {
  const settings = await getSettings(env);
  const sources = await getSources(env);
  const items = [];
  for (const src of sources) {
    let finalCount = 0;
    let updatedAt = null;
    let partWarnings = [];
    try {
      const outRaw = await env.SUB_DB.get(`out_${src.id}`);
      if (outRaw) {
        const out = JSON.parse(outRaw);
        finalCount = out.configs ? out.configs.split("\n").filter(Boolean).length : 0;
        updatedAt = out.updatedAt;
        partWarnings = out.partWarnings || [];
      }
    } catch (e) {
      /* stale/corrupt cached output - report zero counts for this source */
    }
    const parts = src.parts || [];
    const categories = new Set(parts.map((p) => (p.category === "independent" ? "independent" : "cloudflare")));
    const category = categories.size === 1 ? Array.from(categories)[0] : categories.size > 1 ? "mixed" : "cloudflare";
    const baseCount = parts.reduce((sum, p) => sum + (p.baseConfigs || []).length, 0);
    const truncated = parts.some((p) => p.truncated);
    items.push({
      id: src.id,
      slug: src.slug,
      name: src.name,
      category,
      partsCount: parts.length,
      lastSync: src.lastSync,
      updatedAt,
      baseCount,
      finalCount,
      truncated,
      partWarnings
    });
  }
  const cfConnections = (settings.cfConnections || []).map((c) => ({
    id: c.id,
    label: c.label,
    accountId: c.accountId,
    tokenPreview: c.apiToken ? "••••" + c.apiToken.slice(-4) : ""
  }));
  const cleanIpLists = settings.cleanIpLists.map((l) => ({ id: l.id, name: l.name, ips: l.ips, builtin: !!l.builtin }));
  return new Response(
    JSON.stringify({
      cleanIpLists,
      cfConnections,
      items,
      usingDefaultPassword: !env.ADMIN_PASSWORD
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
