import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { getAdminToken } from "@/lib/currentAdminUser";
import { apiClient } from "./axiosInstance";

export const DASHBOARD_CACHE_TTL = 60_000;
export const DETAIL_CACHE_TTL = 2 * 60_000;
export const LIVE_CACHE_TTL = 15_000;

type CacheEntry<T> = {
  response?: AxiosResponse<T>;
  expiresAt: number;
  pending?: Promise<AxiosResponse<T>>;
  touchedAt: number;
};

const MAX_ENTRIES = 200;
const cache = new Map<string, CacheEntry<unknown>>();

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

function cacheKey(url: string, config?: AxiosRequestConfig) {
  return JSON.stringify({
    token: getAdminToken() ?? "anonymous",
    url,
    params: stableValue(config?.params ?? {}),
  });
}

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (!entry.pending && entry.expiresAt <= now) cache.delete(key);
  }
  if (cache.size <= MAX_ENTRIES) return;
  const oldest = [...cache.entries()]
    .sort(([, a], [, b]) => a.touchedAt - b.touchedAt)
    .slice(0, cache.size - MAX_ENTRIES);
  oldest.forEach(([key]) => cache.delete(key));
}

export function cachedApiGet<T>(
  url: string,
  config?: AxiosRequestConfig,
  ttlMs = DETAIL_CACHE_TTL,
): Promise<AxiosResponse<T>> {
  const key = cacheKey(url, config);
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;

  if (existing?.response && existing.expiresAt > now) {
    existing.touchedAt = now;
    return Promise.resolve(existing.response);
  }
  if (existing?.pending) {
    existing.touchedAt = now;
    return existing.pending;
  }

  const entry: CacheEntry<T> = {
    expiresAt: 0,
    touchedAt: now,
  };
  entry.pending = apiClient.get<T>(url, config)
    .then((response) => {
      entry.response = response;
      entry.expiresAt = Date.now() + ttlMs;
      entry.touchedAt = Date.now();
      return response;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    })
    .finally(() => {
      entry.pending = undefined;
      pruneCache();
    });
  cache.set(key, entry as CacheEntry<unknown>);
  return entry.pending;
}

export function clearApiGetCache() {
  cache.clear();
}

export function invalidateApiGetCache(url: string) {
  const marker = `"url":"${url}"`;
  for (const key of cache.keys()) {
    if (key.includes(marker)) cache.delete(key);
  }
}
