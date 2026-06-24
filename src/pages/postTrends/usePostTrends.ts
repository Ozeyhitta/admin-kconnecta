import * as React from "react";
import { apiClient } from "@/services/axiosInstance";
import { ADMIN_CHARTS_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import {
  getCachedPostTrends,
  hasCachedPostTrends,
  setCachedPostTrends,
} from "./postTrendsCache";
import type { PostTrendsResponse, TrendRange } from "./types";

export function usePostTrends(range: TrendRange) {
  const [data, setData] = React.useState<PostTrendsResponse | null>(
    () => getCachedPostTrends(range),
  );
  const [loading, setLoading] = React.useState(() => !hasCachedPostTrends(range));
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const cached = getCachedPostTrends(range);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
    } else {
      setData(null);
      setLoading(true);
      setError(null);
    }
  }, [range]);

  const fetchData = React.useCallback(async (background = false) => {
    const cached = hasCachedPostTrends(range);
    const softLoad = background || cached;

    if (softLoad) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const r = await apiClient.get<PostTrendsResponse>("/api/v1/admin/analytics/post-trends", {
        params: { range },
      });
      setCachedPostTrends(range, r.data);
      setData(r.data);
      setError(null);
    } catch {
      if (!softLoad) {
        setData(null);
        setError("Không tải được dữ liệu phân tích xu hướng.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useIntervalPoll(() => fetchData(), ADMIN_CHARTS_POLL_MS, [fetchData]);

  const refresh = React.useCallback(() => void fetchData(true), [fetchData]);

  return { data, loading, refreshing, error, refresh };
}
