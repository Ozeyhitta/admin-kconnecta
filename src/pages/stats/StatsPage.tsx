import * as React from "react";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { StatsDateFilter } from "@/components/admin/stats-date-filter";
import { apiClient } from "@/services/axiosInstance";
import { ADMIN_CHARTS_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import { createDefaultStatsDateRange, toStatsApiParams, type StatsDateRange } from "@/lib/statsDateRange";
import { DauMauAnalyticsSection } from "./components/DauMauAnalytics";
import { InteractionAnalyticsSection } from "./components/InteractionAnalytics";
import type { EngagementAnalyticsResponse } from "./types";

const StatsPage = () => {
  const [dateRange, setDateRange] = React.useState<StatsDateRange>(() => createDefaultStatsDateRange());
  const [data, setData] = React.useState<EngagementAnalyticsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Reset to skeleton on filter change; background refresh keeps previous data
  React.useEffect(() => {
    setData(null);
    setLoading(true);
  }, [dateRange]);

  const fetchAnalytics = React.useCallback(async () => {
    try {
      const r = await apiClient.get<EngagementAnalyticsResponse>(
        "/api/v1/admin/stats/engagement-analytics",
        { params: toStatsApiParams(dateRange) },
      );
      setData(r.data);
    } catch {
      /* keep previous data on background refresh failure */
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // ADMIN_CHARTS_POLL_MS = null → no automatic polling; only refetches when filter changes
  useIntervalPoll(fetchAnalytics, ADMIN_CHARTS_POLL_MS, [fetchAnalytics]);

  return (
    <>
      <Breadcrumb>
        <BreadcrumbPage>Thống kê &amp; Báo cáo</BreadcrumbPage>
      </Breadcrumb>

      <div className="space-y-8 mb-6">
        <StatsDateFilter value={dateRange} onChange={setDateRange} />

        <DauMauAnalyticsSection data={data?.dauMau ?? null} loading={loading} />

        <InteractionAnalyticsSection data={data?.interactions ?? null} loading={loading} />
      </div>
    </>
  );
};

export default StatsPage;
