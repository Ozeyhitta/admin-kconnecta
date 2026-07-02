import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { StatsDateFilter } from "@/components/admin/stats-date-filter";
import { cachedApiGet, DASHBOARD_CACHE_TTL } from "@/services/apiGetCache";
import { ADMIN_CHARTS_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import {
  createDefaultStatsDateRange,
  describeStatsRange,
  toEngagementAnalyticsApiParams,
  type StatsDateRange,
} from "@/lib/statsDateRange";
import { AutoInsightsSection } from "./components/AutoInsightsSection";
import { DauMauAnalyticsSection } from "./components/DauMauAnalytics";
import { InteractionAnalyticsSection } from "./components/InteractionAnalytics";
import type { EngagementAnalyticsResponse, StatsActiveFilters } from "./types";

/** MAU dưới ngưỡng này thì mẫu quá nhỏ để rút ra xu hướng đáng tin — khớp ngưỡng cảnh báo của backend. */
const MIN_RELIABLE_MAU = 20;
const fmt = new Intl.NumberFormat("vi-VN");

const INTERACTION_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "COMMENT_ADDED", label: "Bình luận" },
  { value: "REACTION_ADDED", label: "Cảm xúc" },
  { value: "POST_CREATED", label: "Bài đăng" },
  { value: "POST_SHARED", label: "Chia sẻ" },
  { value: "FRIEND_REQUEST_SENT", label: "Kết bạn" },
] as const;

const USER_SEGMENT_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "new", label: "Người dùng mới" },
  { value: "returning", label: "Người dùng cũ" },
  { value: "core", label: "Người dùng hoạt động cao" },
  { value: "inactive_risk", label: "Người dùng ít hoạt động" },
] as const;

const INTERACTION_SOURCE_OPTIONS = [
  { value: "all", label: "Tất cả nguồn" },
  { value: "mobile", label: "Mobile" },
  { value: "web", label: "Web" },
  { value: "admin", label: "Admin" },
  { value: "other", label: "Khác" },
] as const;

const StatsPage = () => {
  const [dateRange, setDateRange] = React.useState<StatsDateRange>(() => createDefaultStatsDateRange());
  const [interactionType, setInteractionType] = React.useState<string>("all");
  const [userSegment, setUserSegment] = React.useState<string>("all");
  const [interactionSource, setInteractionSource] = React.useState<string>("all");
  const [data, setData] = React.useState<EngagementAnalyticsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const activeFilters = React.useMemo<StatsActiveFilters>(
    () => ({ interactionType, userSegment, interactionSource }),
    [interactionType, userSegment, interactionSource],
  );

  const apiParams = React.useMemo(
    () => toEngagementAnalyticsApiParams(dateRange, activeFilters),
    [dateRange, activeFilters],
  );

  // Backend engagement-analytics only honors previous_period compare mode
  React.useEffect(() => {
    if (dateRange.compareMode === "previous_month") {
      setDateRange((prev) => ({ ...prev, compareMode: "previous_period" }));
    }
  }, [dateRange.compareMode]);

  // Reset to skeleton on filter change; background refresh keeps previous data
  React.useEffect(() => {
    setData(null);
    setLoading(true);
    setFetchError(null);
  }, [dateRange, activeFilters]);

  const fetchAnalytics = React.useCallback(async () => {
    try {
      const r = await cachedApiGet<EngagementAnalyticsResponse>(
        "/api/v1/admin/stats/engagement-analytics",
        { params: apiParams },
        DASHBOARD_CACHE_TTL
      );
      setData(r.data);
      setFetchError(null);
    } catch {
      setData((prev) => {
        if (prev == null) {
          setFetchError("Không tải được dữ liệu thống kê. Vui lòng kiểm tra kết nối và thử lại.");
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [apiParams]);

  // ADMIN_CHARTS_POLL_MS = null → no automatic polling; only refetches when filter changes
  useIntervalPoll(fetchAnalytics, ADMIN_CHARTS_POLL_MS, [fetchAnalytics]);

  const mau = data?.dauMau.summary.mau30Days;
  const lowData = !loading && data != null && (mau ?? 0) < MIN_RELIABLE_MAU;
  const hasActiveAdvancedFilters =
    interactionType !== "all" || userSegment !== "all" || interactionSource !== "all";

  return (
    <>
      <Breadcrumb>
        <BreadcrumbPage>Thống kê tương tác</BreadcrumbPage>
      </Breadcrumb>

      <div className="space-y-10 mb-6">
        <section className="space-y-3" aria-label="Bộ lọc thống kê">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Bộ lọc</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chọn khoảng thời gian, loại tương tác, nhóm người dùng và nguồn để phân tích.
            </p>
          </div>

          <StatsDateFilter
            value={dateRange}
            onChange={setDateRange}
            compareOptions={["none", "previous_period"]}
            compareModeHint="So sánh trên trang này hiện chỉ áp dụng chế độ «Kỳ trước»."
          />

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Bộ lọc nâng cao
              </p>
              <p className="text-xs text-muted-foreground">
                Kỳ đang xem: <span className="font-medium text-foreground">{describeStatsRange(dateRange)}</span>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="stats-interaction-type" className="text-xs font-medium text-muted-foreground">
                Loại tương tác
              </label>
              <select
                id="stats-interaction-type"
                value={interactionType}
                onChange={(e) => setInteractionType(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {INTERACTION_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="stats-user-segment" className="text-xs font-medium text-muted-foreground">
                Nhóm người dùng
              </label>
              <select
                id="stats-user-segment"
                value={userSegment}
                onChange={(e) => setUserSegment(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {USER_SEGMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="stats-interaction-source" className="text-xs font-medium text-muted-foreground">
                Nguồn tương tác
              </label>
              <select
                id="stats-interaction-source"
                value={interactionSource}
                onChange={(e) => setInteractionSource(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {INTERACTION_SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Mẹo: kết hợp bộ lọc thời gian, loại tương tác, nhóm người dùng và nguồn để phát hiện bất thường theo từng phân khúc.
            {hasActiveAdvancedFilters && (
              <span className="block mt-1 text-amber-700 dark:text-amber-400">
                Các bộ lọc nâng cao (loại tương tác, nhóm người dùng, nguồn) có thể chưa được backend xử lý đầy đủ — tham số vẫn được gửi để tương thích tương lai.
              </span>
            )}
          </p>
          </div>
        </section>

        {fetchError && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">Không tải được dữ liệu</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{fetchError}</p>
            </div>
          </div>
        )}

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

        <div className="space-y-10">
          <DauMauAnalyticsSection
            data={data?.dauMau ?? null}
            loading={loading}
            lowData={lowData}
          />

          <InteractionAnalyticsSection
            data={data?.interactions ?? null}
            loading={loading}
            lowData={lowData}
            dateRange={dateRange}
            activeFilters={activeFilters}
            hasActiveAdvancedFilters={hasActiveAdvancedFilters}
            onInteractionTypeSelect={setInteractionType}
          />

          <AutoInsightsSection data={data} loading={loading} lowData={lowData} />
        </div>
      </div>
    </>
  );
};

export default StatsPage;
