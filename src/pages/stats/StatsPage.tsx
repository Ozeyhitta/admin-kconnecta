import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { StatsDateFilter } from "@/components/admin/stats-date-filter";
import { apiClient } from "@/services/axiosInstance";
import { ADMIN_CHARTS_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import { createDefaultStatsDateRange, toStatsApiParams, type StatsDateRange } from "@/lib/statsDateRange";
import { DauMauAnalyticsSection } from "./components/DauMauAnalytics";
import { InteractionAnalyticsSection } from "./components/InteractionAnalytics";
import type { EngagementAnalyticsResponse } from "./types";

/** MAU dưới ngưỡng này thì mẫu quá nhỏ để rút ra xu hướng đáng tin — khớp ngưỡng cảnh báo của backend. */
const MIN_RELIABLE_MAU = 20;
const fmt = new Intl.NumberFormat("vi-VN");

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

  const mau = data?.dauMau.summary.mau30Days;
  const lowData = !loading && data != null && (mau ?? 0) < MIN_RELIABLE_MAU;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbPage>Thống kê tương tác</BreadcrumbPage>
      </Breadcrumb>

      <div className="space-y-8 mb-6">
        <StatsDateFilter value={dateRange} onChange={setDateRange} />

        {lowData && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Mẫu dữ liệu nhỏ — chỉ mang tính tham khảo</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Hệ thống mới có {fmt.format(mau ?? 0)} người dùng hoạt động (MAU) trong 30 ngày, dưới ngưỡng {MIN_RELIABLE_MAU} cần thiết để
                đánh giá xu hướng đáng tin cậy. Tỉ lệ DAU/MAU, kết luận xu hướng và % tăng trưởng đã được tạm ẩn;
                số liệu thô và biểu đồ bên dưới vẫn chính xác.
              </p>
            </div>
          </div>
        )}

        <DauMauAnalyticsSection data={data?.dauMau ?? null} loading={loading} lowData={lowData} />

        <InteractionAnalyticsSection data={data?.interactions ?? null} loading={loading} lowData={lowData} dateRange={dateRange} />
      </div>
    </>
  );
};

export default StatsPage;
