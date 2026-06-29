import { cachedApiGet, DETAIL_CACHE_TTL } from "@/services/apiGetCache";
import type { InteractionBreakdownItem } from "@/pages/stats/types";
import type { ActivityLogItem } from "../components/activityLogs/types";

export type HourActivityDetail = {
  totalCount: number;
  breakdown: InteractionBreakdownItem[];
  recentLogs: ActivityLogItem[];
  listIncomplete: boolean;
};

type HourDetailResponse = {
  totalCount: number;
  breakdown: InteractionBreakdownItem[];
  recentLogs: ActivityLogItem[];
};

export async function fetchHourActivityDetail(
  date: string,
  hour: number,
): Promise<HourActivityDetail> {
  const response = await cachedApiGet<HourDetailResponse>("/api/v1/admin/stats/activity-hour-detail", {
    params: { date, hour },
  }, DETAIL_CACHE_TTL);
  const { totalCount, breakdown, recentLogs } = response.data;
  return {
    totalCount,
    breakdown,
    recentLogs,
    listIncomplete: recentLogs.length > 0 && totalCount > recentLogs.length,
  };
}
