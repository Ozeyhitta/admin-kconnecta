import * as React from "react";
import { Link } from "react-router";
import { Download, ExternalLink, Loader2, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/axiosInstance";
import { toEngagementAnalyticsApiParams, type StatsDateRange } from "@/lib/statsDateRange";
import {
  BREAKDOWN_COLORS,
  type AnalyticsChartPoint,
  type InteractionActivityLogItem,
  type InteractionBreakdownItem,
  type InteractionChartSelection,
  type InteractionDetailResponse,
  type StatsActiveFilters,
} from "../types";
import { isPostActivityLink, resolveActivityLogCustomerHref, resolveActivityLogHref } from "../lib/activityLogLinks";
import * as echarts from "echarts";

const fmt = new Intl.NumberFormat("vi-VN");
const timeFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });
const DAY_BREAKDOWN_TYPES = ["Bình luận", "Cảm xúc", "Bài đăng", "Chia sẻ", "Kết bạn"] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: StatsDateRange;
  activeFilters: StatsActiveFilters;
  selection: InteractionChartSelection | null;
  chartData?: AnalyticsChartPoint[] | null;
  averageInteractionsPerDay?: number | null;
};

export function InteractionDetailDialog({
  open,
  onOpenChange,
  dateRange,
  activeFilters,
  selection,
  chartData,
  averageInteractionsPerDay,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<InteractionDetailResponse | null>(null);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInst = React.useRef<echarts.ECharts | null>(null);

  React.useEffect(() => {
    if (!open || !selection) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: Record<string, string> = { ...toEngagementAnalyticsApiParams(dateRange, activeFilters) };
    if (selection.kind === "day") {
      params.date = selection.date;
    } else {
      params.actionType = selection.actionType;
    }

    void apiClient
      .get<InteractionDetailResponse>("/api/v1/admin/stats/interaction-detail", { params })
      .then((r) => {
        if (!cancelled) setData(r.data);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError("Không tải được chi tiết tương tác.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, dateRange, activeFilters, selection]);

  React.useEffect(() => {
    if (!open || !data || data.mode !== "type" || !chartRef.current || data.chartData.length === 0) {
      chartInst.current?.dispose();
      chartInst.current = null;
      return;
    }

    chartInst.current ??= echarts.init(chartRef.current);
    chartInst.current.setOption({
      tooltip: { trigger: "axis" },
      grid: { left: "2%", right: "2%", bottom: "4%", top: "8%", containLabel: true },
      xAxis: {
        type: "category",
        data: data.chartData.map((d) => d.label),
        axisLabel: { rotate: data.chartData.length > 12 ? 35 : 0, fontSize: 10 },
      },
      yAxis: { type: "value", minInterval: 1 },
      series: [{
        type: "bar",
        data: data.chartData.map((d) => d.count),
        itemStyle: { borderRadius: [4, 4, 0, 0], color: "#f59e0b" },
        barMaxWidth: 28,
      }],
    }, true);

    const onResize = () => chartInst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chartInst.current?.dispose();
      chartInst.current = null;
    };
  }, [open, data]);

  const title = selection
    ? selection.kind === "day"
      ? `Ngày ${selection.label}`
      : selection.type
    : "Chi tiết";

  const normalizedDayBreakdown = React.useMemo(
    () => (data && data.mode === "day" ? normalizeDayBreakdown(data.breakdown, data.totalCount) : []),
    [data],
  );

  const selectedDayLabel = React.useMemo(() => {
    if (selection?.kind !== "day") return null;
    return data?.selectedDate
      ? new Date(data.selectedDate).toLocaleDateString("vi-VN")
      : selection.label;
  }, [data?.selectedDate, selection]);

  const chartFallbacks = React.useMemo(
    () => getChartFallbacks(selection, chartData, averageInteractionsPerDay),
    [averageInteractionsPerDay, chartData, selection],
  );
  const comparison = data?.comparisons;
  const average30DayCount = comparison?.average30DayCount ?? chartFallbacks.average30DayCount;
  const previousDayCount = comparison?.previousDayCount ?? chartFallbacks.previousDayCount;
  const previousPeriodSameDayCount = comparison?.previousPeriodSameDayCount ?? null;
  const baselineAverage = average30DayCount;
  const aboveBelowAveragePct = getChangePct(data?.totalCount ?? null, baselineAverage);
  const previousDayPct = getChangePct(data?.totalCount ?? null, previousDayCount);
  const previousPeriodPct = getChangePct(data?.totalCount ?? null, previousPeriodSameDayCount);
  const topBreakdownType = React.useMemo(() => {
    if (normalizedDayBreakdown.length === 0) return null;
    return [...normalizedDayBreakdown].sort((a, b) => b.count - a.count)[0];
  }, [normalizedDayBreakdown]);
  const anomalySignal = getAnomalySignal({
    current: data?.totalCount ?? null,
    average: baselineAverage,
    previousDay: previousDayCount,
  });
  const commentary = buildCommentary(aboveBelowAveragePct, topBreakdownType?.type, anomalySignal);
  const isPeakDay = React.useMemo(() => {
    if (selection?.kind !== "day" || !chartData?.length || data?.totalCount == null || data.totalCount <= 0) {
      return false;
    }
    const peakCount = Math.max(...chartData.map((point) => point.count));
    if (data.totalCount < peakCount) return false;
    const peakPoint = chartData.find((point) => point.count === peakCount);
    return peakPoint?.date === selection.date;
  }, [chartData, data?.totalCount, selection]);

  const exportJson = React.useCallback(() => {
    if (!data || selection?.kind !== "day") return;
    const payload = {
      exportedAt: new Date().toISOString(),
      selectedDay: data.selectedDate ?? selection.date,
      title: data.title,
      totalInteractions: data.totalCount,
      comparisons: data.comparisons ?? null,
      breakdown: normalizedDayBreakdown,
      topContents: data.topContents ?? [],
      topUsers: data.topUsers ?? [],
      recentLogs: data.recentLogs,
      generatedCommentary: commentary,
    };
    downloadFile(
      `interaction-detail-${(data.selectedDate ?? selection.date ?? "day").slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
  }, [commentary, data, normalizedDayBreakdown, selection]);

  const exportCsv = React.useCallback(() => {
    if (!data || selection?.kind !== "day") return;
    const rows: string[] = [];
    const esc = (value: string | number | null | undefined) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
    rows.push(["date", "totalInteractions", "previousDay", "average30Day", "previousPeriodSameDay"].map(esc).join(","));
    rows.push([
      data.selectedDate ?? selection.date,
      data.totalCount,
      previousDayCount,
      average30DayCount,
      previousPeriodSameDayCount,
    ].map(esc).join(","));
    rows.push("");
    rows.push(["breakdownType", "count", "percentage"].map(esc).join(","));
    for (const item of normalizedDayBreakdown) {
      rows.push([item.type, item.count, item.percentage].map(esc).join(","));
    }
    rows.push("");
    rows.push(["topContent", "type", "interactionCount"].map(esc).join(","));
    for (const item of data.topContents ?? []) {
      rows.push([item.title ?? item.contentId ?? "Nội dung không tên", item.type ?? "—", item.interactionCount].map(esc).join(","));
    }
    rows.push("");
    rows.push(["topUser", "interactionCount"].map(esc).join(","));
    for (const item of data.topUsers ?? []) {
      rows.push([item.fullName ?? item.username ?? item.userId, item.interactionCount].map(esc).join(","));
    }
    downloadFile(
      `interaction-detail-${(data.selectedDate ?? selection.date ?? "day").slice(0, 10)}.csv`,
      rows.join("\n"),
      "text/csv;charset=utf-8;",
    );
  }, [
    average30DayCount,
    data,
    normalizedDayBreakdown,
    previousDayCount,
    previousPeriodSameDayCount,
    selection,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 pr-12 shrink-0">
          <DialogTitle>{data?.title ?? title}</DialogTitle>
          <DialogDescription>
            {selection?.kind === "day"
              ? "Chi tiết tương tác trong ngày đã chọn."
              : "Biểu đồ theo ngày và hoạt động gần nhất của loại tương tác."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Đang tải chi tiết…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-12">{error}</p>
          ) : data ? (
            <>
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Tổng tương tác</p>
                    <p className="text-2xl font-bold tabular-nums">{fmt.format(data.totalCount)}</p>
                    {selectedDayLabel && (
                      <p className="text-xs text-muted-foreground mt-0.5">Ngày: {selectedDayLabel}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selection?.kind === "day" && isPeakDay && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        <Star className="size-3 mr-1 fill-amber-500 text-amber-500" />
                        Cao nhất kỳ
                      </Badge>
                    )}
                    {selection?.kind === "day" && (
                      <>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCsv}>
                          <Download className="size-3.5" />
                          CSV
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportJson}>
                          <Download className="size-3.5" />
                          JSON
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {selection?.kind === "day" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <ComparisonStat
                    label="So với hôm trước"
                    value={previousDayCount}
                    deltaPct={previousDayPct}
                    fallbackNote={comparison?.previousDayCount == null && chartFallbacks.previousDayCount != null ? "Ước tính từ biểu đồ kỳ" : undefined}
                  />
                  <ComparisonStat
                    label="So với TB 30 ngày"
                    value={average30DayCount}
                    deltaPct={aboveBelowAveragePct}
                    fallbackNote={comparison?.average30DayCount == null && chartFallbacks.average30DayCount != null ? "Ước tính từ biểu đồ kỳ" : undefined}
                  />
                  <ComparisonStat label="Cùng ngày kỳ trước" value={previousPeriodSameDayCount} deltaPct={previousPeriodPct} />
                </div>
              )}

              {selection?.kind === "day" && (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Nhận xét tự động
                  </p>
                  <p className="text-sm leading-relaxed">{commentary}</p>
                </div>
              )}

              {data.mode === "day" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Phân bổ theo loại
                  </p>
                  {normalizedDayBreakdown.map((item) => (
                    <div key={item.type} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.type}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {fmt.format(item.count)} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: BREAKDOWN_COLORS[item.type] ?? "#94a3b8",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selection?.kind === "day" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Top nội dung theo tương tác
                    </p>
                    {data.topContents && data.topContents.length > 0 ? (
                      <ul className="space-y-2">
                        {data.topContents.slice(0, 5).map((item) => (
                          <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                            <div className="min-w-0">
                              <p className="truncate">{item.title ?? item.contentId ?? "Nội dung không tên"}</p>
                              <p className="text-xs text-muted-foreground">{item.type ?? "Không rõ loại"}</p>
                            </div>
                            <span className="tabular-nums text-muted-foreground">{fmt.format(item.interactionCount)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        API chưa trả về top nội dung cho ngày này.
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Top người dùng hoạt động
                    </p>
                    {data.topUsers && data.topUsers.length > 0 ? (
                      <ul className="space-y-2">
                        {data.topUsers.slice(0, 5).map((item) => (
                          <li key={item.userId} className="flex items-center gap-2">
                            <Avatar className="size-7 shrink-0">
                              <AvatarImage src={item.avatarUrl ?? undefined} />
                              <AvatarFallback className="text-[10px]">
                                {(item.fullName ?? item.username ?? "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 text-sm">
                              <p className="truncate">{item.fullName ?? item.username ?? item.userId}</p>
                            </div>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {fmt.format(item.interactionCount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        API chưa trả về top người dùng cho ngày này.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {data.mode === "type" && data.chartData.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Theo ngày trong kỳ
                  </p>
                  <div ref={chartRef} style={{ width: "100%", height: 200 }} />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hoạt động gần đây
                  </p>
                  <Link
                    to="/activity-logs"
                    className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    Xem tất cả
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
                {data.recentLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Không có log trong mục này.</p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {data.recentLogs.map((log) => (
                      <ActivityLogRow key={log.id} log={log} onNavigate={() => onOpenChange(false)} />
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActivityLogRow({
  log,
  onNavigate,
}: {
  log: InteractionActivityLogItem;
  onNavigate: () => void;
}) {
  const [href, setHref] = React.useState<string | null>(() => resolveActivityLogHref(log));

  React.useEffect(() => {
    let cancelled = false;
    const syncHref = resolveActivityLogHref(log);
    if (syncHref) {
      setHref(syncHref);
      return;
    }

    void resolveActivityLogCustomerHref(log).then((resolved) => {
      if (!cancelled) setHref(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [log]);

  const showPostIcon = isPostActivityLink(href);
  const content = (
    <>
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={log.avatarUrl ?? undefined} />
        <AvatarFallback className="text-xs">
          {(log.fullName ?? log.username ?? "?").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium truncate">
            {log.fullName ?? log.username ?? "Người dùng"}
          </span>
          {log.actionLabel && (
            <Badge variant="secondary" className="text-[10px] font-normal">
              {log.actionLabel}
            </Badge>
          )}
        </div>
        {log.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{log.description}</p>
        )}
        {log.createdAt && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {timeFmt.format(new Date(log.createdAt))}
          </p>
        )}
      </div>
      {showPostIcon && (
        <ExternalLink className="size-3.5 shrink-0 mt-1 text-muted-foreground opacity-60" aria-hidden />
      )}
    </>
  );

  if (!href) {
    return <li className="flex items-start gap-3 px-3 py-2.5">{content}</li>;
  }

  return (
    <li>
      <Link
        to={href}
        onClick={onNavigate}
        className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        {content}
      </Link>
    </li>
  );
}

function getChartFallbacks(
  selection: InteractionChartSelection | null,
  chartData: AnalyticsChartPoint[] | null | undefined,
  averageInteractionsPerDay: number | null | undefined,
) {
  if (selection?.kind !== "day" || !chartData?.length) {
    return {
      previousDayCount: null as number | null,
      average30DayCount: averageInteractionsPerDay ?? null,
    };
  }

  const selectedIndex = chartData.findIndex((point) => point.date === selection.date);
  const previousDayCount = selectedIndex > 0 ? chartData[selectedIndex - 1].count : null;
  const trailingWindow = chartData.slice(Math.max(0, selectedIndex - 29), selectedIndex + 1);
  const windowAverage = trailingWindow.length > 0
    ? trailingWindow.reduce((sum, point) => sum + point.count, 0) / trailingWindow.length
    : null;

  return {
    previousDayCount,
    average30DayCount: averageInteractionsPerDay ?? windowAverage,
  };
}

function normalizeDayBreakdown(
  breakdown: InteractionBreakdownItem[],
  totalCount: number,
): InteractionBreakdownItem[] {
  const byType = new Map(breakdown.map((item) => [item.type, item]));
  return DAY_BREAKDOWN_TYPES.map((type) => {
    const found = byType.get(type);
    const count = found?.count ?? 0;
    const percentage = totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(1)) : 0;
    return { type, count, percentage };
  });
}

function getChangePct(current: number | null, baseline: number | null): number | null {
  if (current == null || baseline == null || baseline === 0) return null;
  return ((current - baseline) / baseline) * 100;
}

function getAnomalySignal(input: {
  current: number | null;
  average: number | null;
  previousDay: number | null;
}) {
  const { current, average, previousDay } = input;
  if (current == null || average == null || average === 0) return "Không đủ dữ liệu để đánh giá bất thường.";
  const vsAvg = current / average;
  if (vsAvg >= 1.8) return "Có dấu hiệu đột biến tăng bất thường so với mức trung bình.";
  if (vsAvg <= 0.5) return "Có dấu hiệu giảm sâu bất thường so với mức trung bình.";
  if (previousDay != null && previousDay > 0) {
    const vsPrev = Math.abs((current - previousDay) / previousDay);
    if (vsPrev >= 0.7) return "Biến động lớn so với hôm trước, cần theo dõi thêm.";
  }
  return "Chưa thấy dấu hiệu bất thường rõ rệt.";
}

function buildCommentary(aboveBelowAvgPct: number | null, topType: string | undefined, anomalySignal: string) {
  const avgSentence = aboveBelowAvgPct == null
    ? "Chưa tính được chênh lệch so với trung bình 30 ngày."
    : aboveBelowAvgPct >= 0
      ? `Tổng tương tác cao hơn trung bình ${aboveBelowAvgPct.toFixed(1)}%.`
      : `Tổng tương tác thấp hơn trung bình ${Math.abs(aboveBelowAvgPct).toFixed(1)}%.`;
  const topTypeSentence = topType
    ? `Loại đóng góp lớn nhất là ${topType}.`
    : "Chưa xác định được loại tương tác đóng góp lớn nhất.";
  return `${avgSentence} ${topTypeSentence} ${anomalySignal}`;
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ComparisonStat({
  label,
  value,
  deltaPct,
  fallbackNote,
}: {
  label: string;
  value: number | null;
  deltaPct: number | null;
  fallbackNote?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value == null ? "—" : fmt.format(value)}</p>
      <p className="text-[11px] text-muted-foreground">
        {deltaPct == null ? "Không đủ dữ liệu" : `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
      </p>
      {fallbackNote && <p className="text-[10px] text-muted-foreground mt-0.5">{fallbackNote}</p>}
    </div>
  );
}
