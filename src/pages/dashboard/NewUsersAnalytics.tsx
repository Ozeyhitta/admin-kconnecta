import * as React from "react";
import * as echarts from "echarts";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
  CalendarDays,
  BarChart2,
  Zap,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cachedApiGet, DASHBOARD_CACHE_TTL } from "@/services/apiGetCache";
import { ADMIN_CHARTS_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import { toStatsApiParams, describeStatsRange, formatDateInput, type StatsDateRange } from "@/lib/statsDateRange";
import { DashboardSectionHeader } from "./components/DashboardSectionHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartPoint {
  date: string;
  label: string;
  count: number;
}

interface Summary {
  totalNewUsers: number;
  averagePerDay: number;
  peakDay: string | null;
  peakCount: number;
  lowestDay: string | null;
  lowestCount: number;
  currentPeriodCount: number;
  previousPeriodCount: number;
  growthRate: number | null;
  trendStatus: string;
}

interface Insight {
  type: string;
  level: "warning" | "info" | "success";
  title: string;
  message: string;
}

interface AnalyticsResponse {
  summary: Summary;
  chartData: ChartPoint[];
  insights: Insight[];
}

type GroupBy = "day" | "week" | "month";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("vi-VN");

const TREND_CONFIG: Record<string, { icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  "Tăng mạnh":           { icon: TrendingUp,   color: "text-success",     bg: "bg-success-bg" },
  "Tăng":                { icon: TrendingUp,   color: "text-success",     bg: "bg-success-bg" },
  "Ổn định":             { icon: Minus,        color: "text-slate-500",   bg: "bg-slate-50 dark:bg-slate-900" },
  "Giảm":                { icon: TrendingDown, color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-950" },
  "Giảm mạnh":           { icon: TrendingDown, color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950" },
  "Có phát sinh mới":    { icon: Zap,          color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950" },
  "Không có tăng trưởng":{ icon: Minus,        color: "text-slate-500",   bg: "bg-slate-50 dark:bg-slate-900" },
};

const LEVEL_CONFIG = {
  warning: {
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
  },
  info: {
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
    icon: Info,
    iconColor: "text-blue-500",
  },
  success: {
    bg: "bg-success-bg border-success-border",
    icon: CheckCircle2,
    iconColor: "text-success",
  },
};

// ─── NewUsersSummaryCards ─────────────────────────────────────────────────────

const NewUsersSummaryCards = ({ summary, loading }: { summary: Summary | null; loading: boolean }) => {
  const trendCfg = summary ? (TREND_CONFIG[summary.trendStatus] ?? TREND_CONFIG["Ổn định"]) : null;
  const TrendIcon = trendCfg?.icon ?? Minus;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {/* Tổng user mới */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Tổng user mới</p>
            {loading ? <Skeleton className="h-8 w-16 mt-1" /> : (
              <p className="text-2xl font-bold tabular-nums mt-1">
                {summary ? fmt.format(summary.totalNewUsers) : "—"}
              </p>
            )}
          </div>
          <Users className="h-6 w-6 text-primary opacity-60 mt-0.5 shrink-0" />
        </div>
        {!loading && summary && summary.previousPeriodCount > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Kỳ trước: {fmt.format(summary.previousPeriodCount)}
          </p>
        )}
      </Card>

      {/* Trung bình / ngày */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Trung bình / ngày</p>
            {loading ? <Skeleton className="h-8 w-16 mt-1" /> : (
              <p className="text-2xl font-bold tabular-nums mt-1">
                {summary ? summary.averagePerDay.toFixed(2) : "—"}
              </p>
            )}
          </div>
          <BarChart2 className="h-6 w-6 text-blue-500 opacity-60 mt-0.5 shrink-0" />
        </div>
      </Card>

      {/* Ngày cao nhất */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Ngày cao nhất</p>
            {loading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <>
                <p className="text-2xl font-bold tabular-nums mt-1 text-success">
                  {summary?.peakCount ?? "—"}
                </p>
                {summary?.peakDay && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {new Date(summary.peakDay).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                  </p>
                )}
              </>
            )}
          </div>
          <CalendarDays className="h-6 w-6 text-violet-500 opacity-60 mt-0.5 shrink-0" />
        </div>
      </Card>

      {/* Xu hướng */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Xu hướng</p>
            {loading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <>
                <p className={`text-xl font-bold tabular-nums mt-1 ${trendCfg?.color ?? ""}`}>
                  {summary?.growthRate != null
                    ? `${summary.growthRate >= 0 ? "+" : ""}${summary.growthRate.toFixed(1)}%`
                    : "—"}
                </p>
                {summary && (
                  <span className={`inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5 mt-0.5 ${trendCfg?.bg ?? ""} ${trendCfg?.color ?? ""}`}>
                    <TrendIcon className="h-3 w-3" />
                    {summary.trendStatus}
                  </span>
                )}
              </>
            )}
          </div>
          <TrendIcon className={`h-6 w-6 opacity-50 mt-0.5 shrink-0 ${trendCfg?.color ?? "text-slate-400"}`} />
        </div>
      </Card>
    </div>
  );
};

// ─── NewUsersTrendChart ───────────────────────────────────────────────────────

const NewUsersTrendChart = ({
  chartData,
  summary,
  groupBy,
  loading,
}: {
  chartData: ChartPoint[] | null;
  summary: Summary | null;
  groupBy: GroupBy;
  loading: boolean;
}) => {
  const chartRef  = React.useRef<HTMLDivElement>(null);
  const chartInst = React.useRef<echarts.ECharts | null>(null);

  const counts  = React.useMemo(() => chartData?.map(d => d.count) ?? [], [chartData]);
  const total   = React.useMemo(() => counts.reduce((a, b) => a + b, 0), [counts]);
  const avg     = counts.length > 0 ? total / counts.length : 0;
  const peakIdx = React.useMemo(() => {
    if (counts.length === 0 || total === 0) return -1;
    return counts.indexOf(Math.max(...counts));
  }, [counts, total]);

  React.useEffect(() => {
    if (!chartData || !chartRef.current) return;
    chartInst.current ??= echarts.init(chartRef.current);

    const labels    = chartData.map(d => d.label);
    const hasSparse = counts.filter(c => c > 0).length < counts.length * 0.3;

    chartInst.current.setOption({
      tooltip: {
        trigger: "axis",
        formatter: (params: { dataIndex: number; value: number; name: string }[]) => {
          const idx      = params[0].dataIndex;
          const val      = params[0].value;
          const point    = chartData[idx];
          const d        = new Date(point.date);
          const weekday  = !isNaN(d.getTime()) && groupBy === "day"
            ? d.toLocaleDateString("vi-VN", { weekday: "short" }) : "";
          const prev     = idx > 0 ? counts[idx - 1] : null;
          const delta    = prev !== null ? val - prev : null;
          const isPeak   = idx === peakIdx && val > 0;
          const deltaHtml = delta === null ? "" :
            `<br/><span style="color:${delta > 0 ? "#10b981" : delta < 0 ? "#ef4444" : "#94a3b8"}">` +
            `${delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} ${fmt.format(Math.abs(delta))} so trước</span>`;
          const peakHtml  = isPeak
            ? `<br/><span style="color:#f59e0b;font-weight:600">⭐ Cao nhất trong kỳ</span>` : "";
          const comebackHtml = val > 0 && prev === 0 && idx > 1
            ? `<br/><span style="color:#8b5cf6">Có đăng ký trở lại</span>` : "";
          return `<b>${point.label}</b>${weekday ? ` (${weekday})` : ""}<br/>` +
            `${fmt.format(val)} người dùng mới${deltaHtml}${peakHtml}${comebackHtml}`;
        },
      },
      grid: { left: "2%", right: "2%", bottom: "3%", top: "10%", containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: {
          rotate: groupBy === "month" ? 0 : 30,
          fontSize: 10,
          interval: labels.length > 20 ? Math.ceil(labels.length / 12) - 1 : 0,
        },
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        min: 0,
        max: Math.max(Math.max(...counts, 1) + 1, 5),
        splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } },
      },
      series: [{
        type: "line",
        data: counts.map((c, i) => ({
          value: c,
          itemStyle: i === peakIdx
            ? { color: "#f59e0b", borderWidth: 3 }
            : c === 0
              ? { color: "#cbd5e1", opacity: 0.5 }
              : undefined,
        })),
        smooth: !hasSparse,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { color: "#10b981", width: 2.5 },
        itemStyle: { color: "#10b981" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(16,185,129,0.25)" },
            { offset: 1, color: "rgba(16,185,129,0)" },
          ]),
        },
        markLine: avg > 0 ? {
          silent: true,
          data: [{ yAxis: avg, name: "Trung bình" }],
          label: {
            formatter: `TB: ${avg.toFixed(2)}`,
            position: "end",
            fontSize: 10,
            color: "#94a3b8",
          },
          lineStyle: { color: "#94a3b8", type: "dashed", width: 1 },
        } : undefined,
        markPoint: total > 0 ? {
          data: [{ type: "max", name: "Đỉnh" }],
          label: { fontSize: 10, color: "#fff", formatter: "{c}" },
          itemStyle: { color: "#10b981" },
          symbolSize: 32,
        } : undefined,
      }],
    }, true);

    const onResize = () => chartInst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chartInst.current?.dispose();
      chartInst.current = null;
    };
  }, [chartData, counts, groupBy, peakIdx, avg, total]);

  if (loading || chartData === null) return <Skeleton className="w-full h-[220px]" />;
  if (total === 0) return (
    <p className="text-sm text-muted-foreground py-16 text-center">Chưa có dữ liệu trong kỳ này</p>
  );

  return (
    <>
      <div ref={chartRef} style={{ width: "100%", height: 220 }} />
      {summary && (
        <p className="text-xs text-muted-foreground italic mt-2">
          💡 {fmt.format(summary.totalNewUsers)} user mới trong kỳ.
          {summary.peakDay && ` Đỉnh: ${new Date(summary.peakDay).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} (${summary.peakCount} người).`}
          {summary.growthRate != null && ` So kỳ trước: ${summary.growthRate >= 0 ? "+" : ""}${summary.growthRate.toFixed(1)}%.`}
        </p>
      )}
    </>
  );
};

// ─── NewUsersInsightsBox ──────────────────────────────────────────────────────

const NewUsersInsightsBox = ({ insights, loading }: { insights: Insight[] | null; loading: boolean }) => {
  if (loading) return (
    <div className="space-y-2 mt-4">
      {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
    </div>
  );
  if (!insights || insights.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Phân tích &amp; Cảnh báo
      </p>
      {insights.map((ins, i) => {
        const cfg = LEVEL_CONFIG[ins.level] ?? LEVEL_CONFIG.info;
        const Icon = cfg.icon;
        return (
          <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 ${cfg.bg}`}>
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.iconColor}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug">{ins.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ins.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── NewUsersAnalytics ────────────────────────────────────────────────────────

export const NewUsersAnalytics = ({ dateRange }: { dateRange: StatsDateRange }) => {
  const [groupBy, setGroupBy]     = React.useState<GroupBy>("day");
  const [localFrom, setLocalFrom] = React.useState(dateRange.from);
  const [localTo, setLocalTo]     = React.useState(dateRange.to);
  const [data, setData]           = React.useState<AnalyticsResponse | null>(null);
  const [loading, setLoading]     = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    setLocalFrom(dateRange.from);
    setLocalTo(dateRange.to);
  }, [dateRange.from, dateRange.to]);

  const queryRange = React.useMemo(
    (): StatsDateRange => ({ ...dateRange, from: localFrom, to: localTo }),
    [dateRange, localFrom, localTo],
  );

  // Reset to skeleton only when filter/groupBy changes (not on background polls)
  React.useEffect(() => {
    setData(null);
    setLoading(true);
  }, [groupBy, localFrom, localTo]);

  const fetchData = React.useCallback(async () => {
    try {
      const r = await cachedApiGet<AnalyticsResponse>("/api/v1/admin/stats/new-users-analytics", {
        params: { groupBy, ...toStatsApiParams(queryRange) },
      }, DASHBOARD_CACHE_TTL);
      setData(r.data);
    } catch {
      /* keep previous data on background refresh failure */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupBy, queryRange]);

  const handleManualRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  useIntervalPoll(fetchData, ADMIN_CHARTS_POLL_MS, [fetchData]);

  const rangeLabel = describeStatsRange(queryRange);
  const today = formatDateInput(new Date());
  const maxTo = dateRange.to > today ? today : dateRange.to;

  return (
    <section className="space-y-4">
      <DashboardSectionHeader
        title="Người dùng mới đăng ký"
        subtitle={`${rangeLabel} · Tính từ ngày tạo tài khoản`}
      />
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end justify-end gap-2 mb-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="new-users-from" className="text-xs font-medium text-muted-foreground">
                Từ ngày
              </label>
              <input
                id="new-users-from"
                type="date"
                value={localFrom}
                min={dateRange.from}
                max={localTo}
                onChange={(e) => e.target.value && setLocalFrom(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="new-users-to" className="text-xs font-medium text-muted-foreground">
                Đến ngày
              </label>
              <input
                id="new-users-to"
                type="date"
                value={localTo}
                min={localFrom}
                max={maxTo}
                onChange={(e) => e.target.value && setLocalTo(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={loading || refreshing}
              title="Làm mới dữ liệu"
              className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {(["day", "week", "month"] as GroupBy[]).map(g => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors h-8 ${
                  groupBy === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {g === "day" ? "Ngày" : g === "week" ? "Tuần" : "Tháng"}
              </button>
            ))}
          </div>

        {/* Summary cards */}
        <NewUsersSummaryCards summary={data?.summary ?? null} loading={loading} />

        {/* Chart */}
        <NewUsersTrendChart
          chartData={data?.chartData ?? null}
          summary={data?.summary ?? null}
          groupBy={groupBy}
          loading={loading}
        />

        {/* Insights */}
        <NewUsersInsightsBox insights={data?.insights ?? null} loading={loading} />
      </CardContent>
    </Card>
    </section>
  );
};

export default NewUsersAnalytics;
