import type { PostTrendsResponse, TrendRange } from "./types";

const dataCache = new Map<TrendRange, PostTrendsResponse>();

export function getCachedPostTrends(range: TrendRange): PostTrendsResponse | null {
  return dataCache.get(range) ?? null;
}

export function setCachedPostTrends(range: TrendRange, data: PostTrendsResponse) {
  dataCache.set(range, data);
}

export function hasCachedPostTrends(range: TrendRange): boolean {
  return dataCache.has(range);
}

const RANGE_KEY = "post-trends:range";
const SCROLL_KEY = "post-trends:scroll-y";

export function readPostTrendsRange(): TrendRange {
  if (typeof sessionStorage === "undefined") return "7d";
  return sessionStorage.getItem(RANGE_KEY) === "30d" ? "30d" : "7d";
}

export function writePostTrendsRange(range: TrendRange) {
  sessionStorage.setItem(RANGE_KEY, range);
}

export function readPostTrendsScrollY(): number {
  if (typeof sessionStorage === "undefined") return 0;
  const n = Number(sessionStorage.getItem(SCROLL_KEY));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function writePostTrendsScrollY(y: number) {
  sessionStorage.setItem(SCROLL_KEY, String(Math.max(0, Math.round(y))));
}
