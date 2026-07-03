import * as React from "react";
import {
  Download,
  FileText,
  Heart,
  Loader2,
  MessageSquare,
  Share2,
  Star,
  UserPlus2,
  type LucideIcon,
} from "lucide-react";
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
import {
  ADMIN_DETAIL_MODAL_CLASS,
  AdminDetailSidebar,
} from "@/components/admin/admin-detail-modal";
import { cachedApiGet, DETAIL_CACHE_TTL } from "@/services/apiGetCache";
import { toEngagementAnalyticsApiParams, type StatsDateRange } from "@/lib/statsDateRange";
import {
  BREAKDOWN_COLORS,
  INTERACTION_TYPE_TO_ACTION,
  type AnalyticsChartPoint,
  type InteractionBreakdownItem,
  type InteractionChartSelection,
  type InteractionDetailResponse,
  type StatsActiveFilters,
} from "../types";
import { attachChartDayInteraction } from "../lib/chartDayInteraction";
import { adminPostsByDayLink } from "@/lib/adminListLinks";
import { ActivityLogSidebarList } from "./ActivityLogListItem";
import * as echarts from "echarts";
import { useNavigate } from "react-router";

const fmt = new Intl.NumberFormat("vi-VN");
const DAY_BREAKDOWN_TYPES = ["Bình luận", "Cảm xúc", "Bài đăng", "Chia sẻ", "Kết bạn"] as const;

/** Icon + chart color aligned with dashboard StatCard styling. */
const INTERACTION_TYPE_DETAIL_STYLE: Record<string, { icon: LucideIcon; iconClass: string; chartColor: string }> = {
  "Bài đăng": { icon: FileText, iconClass: "text-sky-500", chartColor: "#0ea5e9" },
  "Bình luận": { icon: MessageSquare, iconClass: "text-pink-500", chartColor: "#ec4899" },
  "Cảm xúc": { icon: Heart, iconClass: "text-red-400", chartColor: "#f87171" },
  "Chia sẻ": { icon: Share2, iconClass: "text-yellow-500", chartColor: "#eab308" },
  "Kết bạn": { icon: UserPlus2, iconClass: "text-emerald-500", chartColor: "#10b981" },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: StatsDateRange;
  activeFilters: StatsActiveFilters;
  selection: InteractionChartSelection | null;
  chartData?: AnalyticsChartPoint[] | null;
  averageInteractionsPerDay?: number | null;
  returnTo?: string;
};

export function InteractionDetailDialog({
  open,
  onOpenChange,
  dateRange,
  activeFilters,
  selection,
  chartData,
  averageInteractionsPerDay,
  returnTo,
}: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<InteractionDetailResponse | null>(null);

  const typeVisual = selection?.kind === "type"
    ? INTERACTION_TYPE_DETAIL_STYLE[selection.type]
    : null;
  const typeChartColor = typeVisual?.chartColor ?? "#f59e0b";

  const chartInst = React.useRef<echarts.ECharts | null>(null);
  const chartCleanupRef = React.useRef<(() => void) | null>(null);
  const chartDomNodeRef = React.useRef<HTMLDivElement | null>(null);
  const chartDataRef = React.useRef<AnalyticsChartPoint[]>([]);
  const onDayClickRef = React.useRef<((point: AnalyticsChartPoint) => void) | undefined>(undefined);
  const [drillOpen, setDrillOpen] = React.useState(false);
  const [drillSelection, setDrillSelection] = React.useState<InteractionChartSelection | null>(null);

  const chartRef = React.useCallback((node: HTMLDivElement | null) => {
    // 1. Clean up old node/instance/listeners if they exist
    if (chartCleanupRef.current) {
      chartCleanupRef.current();
      chartCleanupRef.current = null;
    }
    if (chartInst.current) {
      chartInst.current.dispose();
      chartInst.current = null;
    }

    chartDomNodeRef.current = node;
    if (node === null) return;

    if (!data || data.mode !== "type" || data.chartData.length === 0) {
      return;
    }

    // Always dispose previous instance on this DOM node if it exists to avoid conflicts
    const existingInst = echarts.getInstanceByDom(node);
    if (existingInst) {
      existingInst.dispose();
    }

    const instance = echarts.init(node);
    chartInst.current = instance;
    chartDataRef.current = data.chartData;

    instance.setOption({
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
        itemStyle: { borderRadius: [4, 4, 0, 0], color: typeChartColor },
        barMaxWidth: 28,
      }],
    }, true);

    const resizeTimers = [
      setTimeout(() => instance.resize(), 50),
      setTimeout(() => instance.resize(), 150),
      setTimeout(() => instance.resize(), 300),
      setTimeout(() => instance.resize(), 500),
    ];

    const detach = attachChartDayInteraction(
      instance,
      () => data.chartData,
      () => onDayClickRef.current,
    );

    const onResize = () => instance.resize();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => { instance.resize(); });
    ro.observe(node);

    chartCleanupRef.current = () => {
      resizeTimers.forEach(clearTimeout);
      detach();
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [data, typeChartColor]);

  React.useEffect(() => {
    return () => {
      if (chartCleanupRef.current) {
        chartCleanupRef.current();
        chartCleanupRef.current = null;
      }
      if (chartInst.current) {
        chartInst.current.dispose();
        chartInst.current = null;
      }
    };
  }, []);

  const openDrillDown = React.useCallback((next: InteractionChartSelection) => {
    setDrillSelection(next);
    setDrillOpen(true);
  }, []);

  const navigateToPostsByDay = React.useCallback((date: string) => {
    onOpenChange(false);
    navigate(
      adminPostsByDayLink(date),
      returnTo ? { state: { returnTo } } : undefined,
    );
  }, [navigate, onOpenChange, returnTo]);

  const handleBreakdownTypeClick = React.useCallback((item: { type: string; count: number }) => {
    if (item.count <= 0) return;
    if (item.type === "Bài đăng" && selection?.kind === "day") {
      navigateToPostsByDay(selection.date);
      return;
    }
    const actionType = INTERACTION_TYPE_TO_ACTION[item.type];
    if (actionType) {
      openDrillDown({ kind: "type", type: item.type, actionType });
    }
  }, [navigateToPostsByDay, openDrillDown, selection]);

  React.useEffect(() => {
    if (!open) {
      setDrillOpen(false);
      setDrillSelection(null);
    }
  }, [open]);

  React.useEffect(() => {
    onDayClickRef.current = (point) => {
      if (selection?.kind === "type" && selection.type === "Bài đăng") {
        navigateToPostsByDay(point.date);
        return;
      }
      openDrillDown({ kind: "day", date: point.date, label: point.label });
    };
  }, [navigateToPostsByDay, openDrillDown, selection]);

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

    void cachedApiGet<InteractionDetailResponse>(
      "/api/v1/admin/stats/interaction-detail",
      { params },
      DETAIL_CACHE_TTL,
    )
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



  const recentLogsPanel = data ? (
    <AdminDetailSidebar
      title="Hoạt động gần đây"
      subtitle={
        data.recentLogs.length > 0
          ? `${fmt.format(data.recentLogs.length)} mục gần nhất`
          : "Chưa có log"
      }
      viewAllHref="/activity-logs"
      viewAllState={returnTo ? { returnTo } : undefined}
      onViewAll={() => onOpenChange(false)}
    >
      <ActivityLogSidebarList
        logs={data.recentLogs}
        onNavigate={() => onOpenChange(false)}
        linkState={returnTo ? { returnTo } : undefined}
        emptyMessage="Không có log trong mục này."
      />
    </AdminDetailSidebar>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={ADMIN_DETAIL_MODAL_CLASS}>
        <DialogHeader className="px-6 pt-6 pb-4 pr-12 shrink-0 border-b bg-gradient-to-r from-background to-muted/30">
          <DialogTitle className="text-lg flex items-center gap-2.5">
            {typeVisual && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                <typeVisual.icon className={`size-5 ${typeVisual.iconClass}`} aria-hidden />
              </span>
            )}
            <span>{data?.title ?? title}</span>
          </DialogTitle>
          {selection?.kind === "type" && (
            <DialogDescription>
              Biểu đồ theo ngày và hoạt động gần nhất của loại tương tác.
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Đang tải chi tiết…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive text-center py-20">{error}</p>
        ) : data ? (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="flex-1 min-w-0 overflow-y-auto px-6 py-5 space-y-5">
              <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-amber-500/5 px-5 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Tổng tương tác
                    </p>
                    <p className="text-3xl font-bold tabular-nums mt-1">{fmt.format(data.totalCount)}</p>
                    {selectedDayLabel && (
                      <p className="text-sm text-muted-foreground mt-1">Ngày {selectedDayLabel}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                    {selection?.kind === "day" && isPeakDay && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                        <Star className="size-3 mr-1 fill-amber-500 text-amber-500" />
                        Cao nhất kỳ
                      </Badge>
                    )}
                    {selection?.kind === "day" && (
                      <>

                        <Button variant="outline" size="sm" className="h-8 text-xs bg-background/80" onClick={exportJson}>
                          <Download className="size-3.5" />
                          JSON
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {selection?.kind === "day" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <ComparisonStat
                    label="Cùng ngày kỳ trước"
                    value={previousPeriodSameDayCount}
                    deltaPct={previousPeriodPct}
                  />
                </div>
              )}

              {selection?.kind === "day" && (
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/80 dark:text-amber-300 mb-1.5">
                    Nhận xét tự động
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/90">{commentary}</p>
                </div>
              )}

              {data.mode === "day" && (
                <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Phân bổ theo loại
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {selection?.kind === "day" ? "Nhấn loại để xem chi tiết hoặc danh sách bài đăng" : "Nhấn loại để xem chi tiết"}
                    </p>
                  </div>
                  {normalizedDayBreakdown.map((item) => {
                    const clickable = item.count > 0 && Boolean(INTERACTION_TYPE_TO_ACTION[item.type]);
                    return (
                      <div
                        key={item.type}
                        role={clickable ? "button" : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        className={[
                          "space-y-1.5 rounded-md -mx-1 px-1.5 py-1 transition-colors",
                          clickable ? "cursor-pointer hover:bg-muted/60" : "",
                        ].join(" ").trim()}
                        onClick={clickable ? () => handleBreakdownTypeClick(item) : undefined}
                        onKeyDown={clickable ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleBreakdownTypeClick(item);
                          }
                        } : undefined}
                      >
                        <div className="flex justify-between text-sm gap-3">
                          <span className="font-medium">{item.type}</span>
                          <span className="tabular-nums text-muted-foreground shrink-0">
                            {fmt.format(item.count)} ({item.percentage}%)
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: BREAKDOWN_COLORS[item.type] ?? "#94a3b8",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selection?.kind === "day" && (
                <div className="space-y-3">
                  <div className="rounded-lg border-l-4 border-l-primary bg-muted/30 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">
                      Chi tiết tương tác trong ngày đã chọn
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Tổng hợp nội dung và người dùng có mức tương tác cao nhất trong ngày.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Top nội dung theo tương tác
                      </p>
                      {data.topContents && data.topContents.length > 0 ? (
                        <ul className="space-y-2.5">
                          {data.topContents.slice(0, 5).map((item, index) => (
                            <li
                              key={item.id}
                              className="flex items-start justify-between gap-2 text-sm rounded-lg bg-muted/30 px-2.5 py-2"
                            >
                              <div className="min-w-0 flex items-start gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground tabular-nums mt-0.5 w-4">
                                  {index + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {item.title ?? item.contentId ?? "Nội dung không tên"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{item.type ?? "Không rõ loại"}</p>
                                </div>
                              </div>
                              <span className="tabular-nums text-xs font-semibold text-primary shrink-0">
                                {fmt.format(item.interactionCount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground py-6 text-center rounded-lg bg-muted/20">
                          API chưa trả về top nội dung cho ngày này.
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Top người dùng hoạt động
                      </p>
                      {data.topUsers && data.topUsers.length > 0 ? (
                        <ul className="space-y-2">
                          {data.topUsers.slice(0, 5).map((item, index) => (
                            <li
                              key={item.userId}
                              className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-2.5 py-2"
                            >
                              <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-4">
                                {index + 1}
                              </span>
                              <Avatar className="size-8 shrink-0 ring-2 ring-background">
                                <AvatarImage src={item.avatarUrl ?? undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {(item.fullName ?? item.username ?? "?").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1 text-sm">
                                <p className="truncate font-medium">
                                  {item.fullName ?? item.username ?? item.userId}
                                </p>
                              </div>
                              <span className="text-xs tabular-nums font-semibold text-primary">
                                {fmt.format(item.interactionCount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground py-6 text-center rounded-lg bg-muted/20">
                          API chưa trả về top người dùng cho ngày này.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {data.mode === "type" && data.chartData.length > 0 && (
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Theo ngày trong kỳ
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {selection?.kind === "type" && selection.type === "Bài đăng"
                        ? "Nhấn cột để xem bài đăng trong ngày"
                        : "Nhấn cột để xem chi tiết ngày"}
                    </p>
                  </div>
                  <div ref={chartRef} style={{ width: "100%", height: 220 }} />
                </div>
              )}
            </div>

            <div className="lg:w-[min(30rem,36%)] xl:w-[min(34rem,38%)] shrink-0 min-h-[280px] lg:min-h-0 lg:max-h-none max-h-[42vh]">
              {recentLogsPanel}
            </div>
          </div>
        ) : null}
      </DialogContent>

      {drillOpen && drillSelection ? (
        <InteractionDetailDialog
          open={drillOpen}
          onOpenChange={setDrillOpen}
          dateRange={dateRange}
          activeFilters={activeFilters}
          selection={drillSelection}
          chartData={chartData ?? data?.chartData ?? null}
          averageInteractionsPerDay={averageInteractionsPerDay}
          returnTo={returnTo}
        />
      ) : null}
    </Dialog>
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
  const deltaTone = deltaPct == null
    ? "text-muted-foreground"
    : deltaPct >= 0
      ? "text-emerald-600"
      : "text-red-500";

  return (
    <div className="rounded-xl border bg-card px-3.5 py-3 shadow-sm">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums mt-0.5">{value == null ? "—" : fmt.format(value)}</p>
      <p className={`text-[11px] font-medium mt-1 ${deltaTone}`}>
        {deltaPct == null ? "Không đủ dữ liệu" : `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
      </p>
      {fallbackNote && <p className="text-[10px] text-muted-foreground mt-0.5">{fallbackNote}</p>}
    </div>
  );
}
