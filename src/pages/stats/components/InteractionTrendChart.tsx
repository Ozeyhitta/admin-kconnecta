import * as React from "react";
import * as echarts from "echarts";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/services/axiosInstance";
import { toEngagementAnalyticsApiParams, type StatsDateRange } from "@/lib/statsDateRange";
import { attachChartDayInteraction } from "../lib/chartDayInteraction";
import type { AnalyticsChartPoint, InteractionBreakdownItem, InteractionSummary, StatsActiveFilters } from "../types";

const fmt = new Intl.NumberFormat("vi-VN");
const CLICK_HINT = "<br/><span style=\"color:#94a3b8;font-size:11px\">Nhấn để xem chi tiết theo ngày</span>";

interface InteractionTrendChartProps {
  chartData: AnalyticsChartPoint[] | null;
  summary: InteractionSummary | null;
  dateRange: StatsDateRange;
  activeFilters: StatsActiveFilters;
  loading?: boolean;
  emptyMessage?: string;
  onDayClick?: (point: AnalyticsChartPoint) => void;
}

type DayDetail = {
  totalCount: number;
  breakdownByType: Record<string, number>;
};

const DETAIL_TYPES = ["Bình luận", "Cảm xúc", "Bài đăng", "Chia sẻ", "Kết bạn"] as const;

export const InteractionTrendChart = ({
  chartData,
  summary,
  dateRange,
  activeFilters,
  loading,
  emptyMessage = "Chưa có dữ liệu tương tác",
  onDayClick,
}: InteractionTrendChartProps) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<echarts.ECharts | null>(null);
  const chartDataRef = React.useRef(chartData);
  const onDayClickRef = React.useRef(onDayClick);
  const [detailCache, setDetailCache] = React.useState<Record<string, DayDetail>>({});
  const detailCacheRef = React.useRef(detailCache);
  const loadingDatesRef = React.useRef<Set<string>>(new Set());
  chartDataRef.current = chartData;
  onDayClickRef.current = onDayClick;
  detailCacheRef.current = detailCache;

  const counts = React.useMemo(() => chartData?.map(d => d.count) ?? [], [chartData]);
  const peakIdx = React.useMemo(() => {
    if (counts.length === 0 || !summary?.peakInteractionDay) return -1;
    return chartData?.findIndex(d => d.date === summary.peakInteractionDay) ?? -1;
  }, [counts, chartData, summary?.peakInteractionDay]);
  const average = summary?.averageInteractionsPerDay ?? (counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0);
  const warningThreshold = average > 0 ? average * 0.7 : 0;

  const dataKey = chartData === null ? "" : JSON.stringify(chartData);

  React.useEffect(() => {
    setDetailCache({});
    loadingDatesRef.current.clear();
  }, [dataKey, dateRange.from, dateRange.to, activeFilters.interactionType, activeFilters.userSegment, activeFilters.interactionSource]);

  const detailParams = React.useMemo(
    () => toEngagementAnalyticsApiParams(dateRange, activeFilters),
    [dateRange, activeFilters],
  );

  const fetchDayDetail = React.useCallback((date: string) => {
    if (!date || detailCacheRef.current[date] || loadingDatesRef.current.has(date)) return;
    loadingDatesRef.current.add(date);

    const params: Record<string, string> = { ...detailParams, date };
    void apiClient
      .get<{ totalCount: number; breakdown: InteractionBreakdownItem[] }>("/api/v1/admin/stats/interaction-detail", { params })
      .then((res) => {
        const breakdownByType: Record<string, number> = {};
        for (const item of res.data.breakdown ?? []) {
          breakdownByType[item.type] = item.count;
        }
        setDetailCache((prev) => ({
          ...prev,
          [date]: { totalCount: res.data.totalCount ?? 0, breakdownByType },
        }));
      })
      .catch(() => {
        setDetailCache((prev) => ({
          ...prev,
          [date]: { totalCount: 0, breakdownByType: {} },
        }));
      })
      .finally(() => {
        loadingDatesRef.current.delete(date);
      });
  }, [detailParams]);

  const fetchDayDetailRef = React.useRef(fetchDayDetail);
  fetchDayDetailRef.current = fetchDayDetail;

  // Init chart when data is shown; attach stable click listeners via refs.
  React.useEffect(() => {
    if (!chartData?.length || !ref.current) return;

    inst.current ??= echarts.init(ref.current);

    const detachInteraction = attachChartDayInteraction(
      inst.current,
      () => chartDataRef.current ?? [],
      () => onDayClickRef.current,
      (idx) => {
        if (idx === null) return;
        const data = chartDataRef.current;
        if (data?.[idx]) fetchDayDetailRef.current(data[idx].date);
      },
    );

    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      detachInteraction();
      window.removeEventListener("resize", onResize);
      inst.current?.dispose();
      inst.current = null;
    };
  }, [dataKey]);

  // Update chart options when visual data changes (does not tear down click listeners).
  React.useEffect(() => {
    if (!chartData || !inst.current) return;

    inst.current.setOption({
      tooltip: {
        trigger: "axis",
        formatter: (params: { dataIndex: number; value: number }[]) => {
          const idx = params[0].dataIndex;
          const val = params[0].value;
          const point = chartData[idx];
          fetchDayDetailRef.current(point.date);
          const detail = detailCacheRef.current[point.date];
          const isDetailLoading = !detail;
          const prev = idx > 0 ? counts[idx - 1] : null;
          const delta = prev !== null ? val - prev : null;
          const deltaHtml = delta === null ? "" :
            `<br/><span style="color:${delta > 0 ? "#10b981" : delta < 0 ? "#ef4444" : "#94a3b8"}">` +
            `${delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} ${fmt.format(Math.abs(delta))} so với ngày trước</span>`;
          const peakHtml = idx === peakIdx && val > 0
            ? `<br/><span style="color:#f59e0b;font-weight:600">⭐ Cao nhất trong kỳ</span>` : "";
          const warningHtml = val < warningThreshold && average > 0
            ? `<br/><span style="color:#d97706">⚠ Thấp hơn trung bình trên 30%</span>`
            : "";
          const avgHtml = average > 0
            ? `<br/><span style="color:#94a3b8">TB/ngày: ${average.toFixed(2)} · ${val >= average ? "trên" : "dưới"} trung bình</span>`
            : "";
          const breakdownHtml = isDetailLoading
            ? "<br/><span style='color:#94a3b8'>Đang tải chi tiết theo loại...</span>"
            : DETAIL_TYPES
              .map((type) => `<br/>• ${type}: <b>${fmt.format(detail.breakdownByType[type] ?? 0)}</b>`)
              .join("");
          const clickHtml = onDayClickRef.current ? CLICK_HINT : "";
          return `<b>Ngày: ${point.label}</b><br/>Tổng lượt tương tác: <b>${fmt.format(detail?.totalCount ?? val)}</b>${deltaHtml}${peakHtml}${avgHtml}${warningHtml}${breakdownHtml}${clickHtml}`;
        },
      },
      legend: {
        data: ["Lượt tương tác/ngày", "Trung bình"],
        bottom: 0,
        itemWidth: 14,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: "#64748b" },
      },
      grid: { left: "1%", right: "2%", bottom: "12%", top: "6%", containLabel: true },
      xAxis: {
        type: "category",
        data: chartData.map(d => d.label),
        axisLabel: {
          rotate: chartData.length > 18 ? 45 : chartData.length > 10 ? 30 : 0,
          hideOverlap: true,
          interval: "auto",
          fontSize: 10,
          margin: 10,
        },
      },
      yAxis: {
        type: "value",
        name: "Lượt tương tác",
        nameLocation: "middle",
        nameGap: 45,
        minInterval: 1,
        splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } },
      },
      series: [{
        name: "Lượt tương tác/ngày",
        type: "bar",
        triggerEvent: true,
        emphasis: {
          focus: "series",
          itemStyle: { opacity: 0.85 },
        },
        data: counts.map((c, i) => ({
          value: c,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: i === peakIdx
              ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "#f59e0b" },
                  { offset: 1, color: "#fcd34d" },
                ])
              : average > 0 && c < warningThreshold
                ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "#fbbf24" },
                    { offset: 1, color: "#fde68a" },
                  ])
              : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "#f59e0b" },
                  { offset: 1, color: "#fde68a" },
                ]),
            borderColor: average > 0 && c < warningThreshold ? "#d97706" : undefined,
            borderWidth: average > 0 && c < warningThreshold ? 1 : 0,
          },
        })),
        barMaxWidth: 32,
        markLine: average > 0 ? {
          silent: true,
          data: [{ yAxis: average, name: "Trung bình" }],
          label: { formatter: `TB/ngày: ${average.toFixed(2)}`, position: "end", fontSize: 10, color: "#94a3b8" },
          lineStyle: { color: "#94a3b8", type: "dashed", width: 1.5 },
        } : undefined,
      }],
    }, true);
  }, [dataKey, chartData, counts, peakIdx, average, warningThreshold]);

  // Refresh tooltip after detail cache loads without re-attaching listeners.
  React.useEffect(() => {
    if (!inst.current || !chartData?.length) return;
    inst.current.dispatchAction({ type: "hideTip" });
  }, [detailCache, chartData]);

  if (loading || chartData === null) return <Skeleton className="w-full h-[260px] rounded-md" />;
  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 py-14 px-4">
        <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
        <p className="text-xs text-muted-foreground mt-1">Thử đổi bộ lọc hoặc mở rộng khoảng thời gian.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {onDayClick && (
        <p className="text-xs text-muted-foreground text-right">Nhấn biểu đồ để xem chi tiết theo ngày</p>
      )}
      <div ref={ref} style={{ width: "100%", height: 260 }} />
    </div>
  );
};

export default InteractionTrendChart;
