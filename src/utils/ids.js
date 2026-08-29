export function shortId() {
  return crypto.randomUUID().split("-")[0];
}

export function makeSlug() {
  return crypto.randomUUID().split("-")[0];
}

export function makeUniqueSlug(sources) {
  const existing = new Set((sources || []).map((s) => s.slug).filter(Boolean));
  let slug = makeSlug();
  while (existing.has(slug)) slug = makeSlug();
  return slug;
}
