/** Build admin list URL with ra-core filter query (same format as dashboard cards). */
export function adminListLink(resource: string, filter?: Record<string, string>) {
  const path = `/${resource}`;
  if (!filter || Object.keys(filter).length === 0) return path;
  const params = new URLSearchParams();
  params.set("filter", JSON.stringify(filter));
  return `${path}?${params.toString()}`;
}

/** Posts created on a single calendar day, newest first. */
export function adminPostsByDayLink(date: string) {
  const params = new URLSearchParams();
  params.set("filter", JSON.stringify({ createdFrom: date, createdTo: date }));
  params.set("sort", "createdAt");
  params.set("order", "DESC");
  return `/posts?${params.toString()}`;
}
