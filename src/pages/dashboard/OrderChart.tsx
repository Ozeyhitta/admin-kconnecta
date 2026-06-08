import * as React from "react";
import * as echarts from "echarts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/services/axiosInstance";
import { ADMIN_CHARTS_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import { toStatsApiParams, describeStatsRange, type StatsDateRange } from "@/lib/statsDateRange";
import { getChartTheme } from "@/lib/chartColors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HourData { hour: number; count: number }
interface DayData  { day: string;  count: number }
type Period = "day" | "week" | "month";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("vi-VN");

function fillDateGaps(data: DayData[], from: string, to: string): DayData[] {
  const map = new Map(data.map(d => [d.day.slice(0, 10), d.count]));
  const result: DayData[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    result.push({ day: key, count: map.get(key) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function formatDayLabel(raw: string, period: Period): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  if (period === "month") return d.toLocaleDateString("vi-VN", { month: "short", year: "numeric" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function hourInsight(counts: number[]): string {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return "";
  const peakH = counts.indexOf(Math.max(...counts));
  const peakPct = ((counts[peakH] / total) * 100).toFixed(0);
  const deadZone = [0, 1, 2, 3, 4, 5].filter(h => counts[h] === 0);
  const deadStr = deadZone.length >= 2
    ? ` Vắng nhất ${deadZone[0]}h–${deadZone[deadZone.length - 1] + 1}h.`
    : "";
  return `Cao điểm lúc ${peakH}h (${peakPct}% tổng ngày).${deadStr}`;
}

function dayInsight(data: DayData[], period: Period): string {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return "";
  const peak = data.reduce((m, d) => d.count > m.count ? d : m);
  const n = data.length;
  const first  = data.slice(0, n >> 1).reduce((s, d) => s + d.count, 0);
  const second = data.slice(n >> 1).reduce((s, d) => s + d.count, 0);
  const trend  = second > first * 1.1 ? "tăng" : second < first * 0.9 ? "giảm" : "ổn định";
  const peakLabel = formatDayLabel(peak.day, period);
  return `${fmt.format(total)} hoạt động tổng. Đỉnh ${peakLabel}: ${fmt.format(peak.count)} lượt. Xu hướng ${trend} về cuối kỳ.`;
}

// ─── ActivityHourCard ─────────────────────────────────────────────────────────

export const ActivityHourCard = ({ dateRange }: { dateRange: StatsDateRange }) => {
  const chartRef  = React.useRef<HTMLDivElement>(null);
  const chartInst = React.useRef<echarts.ECharts | null>(null);
  const [hourData, setHourData] = React.useState<HourData[] | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const r = await apiClient.get<HourData[]>("/api/v1/admin/stats/activity-by-hour", {
        params: toStatsApiParams(dateRange),
      });
      setHourData(r.data);
    } catch {
      setHourData([]);
    }
  }, [dateRange]);

  React.useEffect(() => { setHourData(null); }, [dateRange]);
  useIntervalPoll(fetchData, ADMIN_CHARTS_POLL_MS, [fetchData]);

  const counts = React.useMemo(() =>
    hourData
      ? Array.from({ length: 24 }, (_, h) => hourData.find(d => d.hour === h)?.count ?? 0)
      : null,
  [hourData]);

  const total    = React.useMemo(() => counts?.reduce((a, b) => a + b, 0) ?? 0, [counts]);
  const peakHour = React.useMemo(() => counts ? counts.indexOf(Math.max(...counts)) : -1, [counts]);

  React.useEffect(() => {
    if (!counts || !chartRef.current) return;
    chartInst.current ??= echarts.init(chartRef.current);

    chartInst.current.setOption({
      tooltip: {
        trigger: "axis",
        formatter: (params: { dataIndex: number; value: number }[]) => {
          const h   = params[0].dataIndex;
          const val = params[0].value;
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
          const session = h < 6 ? "Đêm / Rạng sáng"
            : h < 12 ? "Buổi sáng"
            : h < 14 ? "Buổi trưa"
            : h < 18 ? "Buổi chiều"
            : "Buổi tối";
          return `<b>${h}:00 – ${h + 1}:00</b> (${session})<br/>`
            + `${fmt.format(val)} hoạt động · ${pct}% trong ngày`;
        },
      },
      grid: { left: "2%", right: "2%", bottom: "3%", top: "4%", containLabel: true },
      xAxis: {
        type: "category",
        data: Array.from({ length: 24 }, (_, h) => `${h}h`),
        axisLabel: { interval: 1, fontSize: 10 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { type: "dashed", color: getChartTheme().gridLineColor } },
      },
      series: [{
        type: "bar",
        barMaxWidth: 28,
        data: counts.map((c, i) => ({
          value: c,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: i === peakHour
              ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "#f59e0b" },
                  { offset: 1, color: "#fcd34d" },
                ])
              : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "#6366f1" },
                  { offset: 1, color: "#a5b4fc" },
                ]),
          },
        })),
      }],
    }, true);

    const onResize = () => chartInst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chartInst.current?.dispose();
      chartInst.current = null;
    };
  }, [counts, peakHour, total]);

  const insight    = React.useMemo(() => counts ? hourInsight(counts) : "", [counts]);
  const rangeLabel = describeStatsRange(dateRange);

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Header */}
        <div className="mb-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Hoạt động theo giờ trong ngày
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rangeLabel} · Tổng của: đăng bài, bình luận, cảm xúc, chia sẻ, kết bạn
          </p>
        </div>

        {/* KPI row */}
        {counts !== null && total > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 my-3">
            <div>
              <p className="text-xs text-muted-foreground">Tổng hoạt động</p>
              <p className="text-xl font-bold tabular-nums">{fmt.format(total)}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Giờ cao điểm</p>
              <p className="text-xl font-bold tabular-nums text-amber-500">
                {peakHour}:00 · {fmt.format(counts[peakHour])} lượt
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Trung bình / giờ</p>
              <p className="text-xl font-bold tabular-nums">{(total / 24).toFixed(1)}</p>
            </div>
          </div>
        )}

        {/* Chart */}
        {counts === null ? (
          <Skeleton className="w-full h-[220px]" />
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">Chưa có dữ liệu</p>
        ) : (
          <div ref={chartRef} style={{ width: "100%", height: 220 }} />
        )}

        {/* Insight */}
        {insight && (
          <p className="text-xs text-muted-foreground italic mt-2">💡 {insight}</p>
        )}
      </CardContent>
    </Card>
  );
};

// ─── ActivityDayCard ──────────────────────────────────────────────────────────

export const ActivityDayCard = ({ dateRange }: { dateRange: StatsDateRange }) => {
  const chartRef  = React.useRef<HTMLDivElement>(null);
  const chartInst = React.useRef<echarts.ECharts | null>(null);
  const [period, setPeriod]   = React.useState<Period>("day");
  const [rawData, setRawData] = React.useState<DayData[] | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const r = await apiClient.get<DayData[]>("/api/v1/admin/stats/activity-by-day", {
        params: { period, ...toStatsApiParams(dateRange) },
      });
      setRawData(r.data);
    } catch {
      setRawData([]);
    }
  }, [period, dateRange]);

  React.useEffect(() => { setRawData(null); }, [period, dateRange]);
  useIntervalPoll(fetchData, ADMIN_CHARTS_POLL_MS, [fetchData]);

  const data = React.useMemo((): DayData[] | null => {
    if (!rawData) return null;
    return period === "day"
      ? fillDateGaps(rawData, dateRange.from, dateRange.to)
      : rawData;
  }, [rawData, period, dateRange]);

  const counts   = React.useMemo(() => data?.map(d => d.count) ?? [], [data]);
  const total    = React.useMemo(() => counts.reduce((a, b) => a + b, 0), [counts]);
  const avg      = counts.length > 0 ? total / counts.length : 0;
  const peakIdx  = React.useMemo(() => {
    if (counts.length === 0 || total === 0) return -1;
    return counts.indexOf(Math.max(...counts));
  }, [counts, total]);

  const trendBadge = React.useMemo(() => {
    if (!data || data.length < 4 || total === 0) return null;
    const n      = data.length;
    const first  = data.slice(0, n >> 1).reduce((s, d) => s + d.count, 0);
    const second = data.slice(n >> 1).reduce((s, d) => s + d.count, 0);
    if (first === 0 && second === 0) return null;
    if (first === 0) return { up: true, text: "+∞% nửa cuối" };
    const pct = ((second - first) / first * 100).toFixed(1);
    return { up: second >= first, text: `${second >= first ? "+" : ""}${pct}% nửa cuối kỳ` };
  }, [data, total]);

  React.useEffect(() => {
    if (!data || !chartRef.current) return;
    chartInst.current ??= echarts.init(chartRef.current);

    const labels    = data.map(d => formatDayLabel(d.day, period));
    const hasSparse = counts.filter(c => c > 0).length < counts.length * 0.3;

    chartInst.current.setOption({
      tooltip: {
        trigger: "axis",
        formatter: (params: { dataIndex: number; value: number; name: string }[]) => {
          const idx = params[0].dataIndex;
          const val = params[0].value;
          const d   = new Date(data[idx]?.day ?? "");
          const weekday = !isNaN(d.getTime()) && period === "day"
            ? d.toLocaleDateString("vi-VN", { weekday: "short" })
            : "";
          const prev  = idx > 0 ? counts[idx - 1] : null;
          const delta = prev !== null ? val - prev : null;
          const deltaHtml = delta === null ? ""
            : `<br/><span style="color:${delta >= 0 ? getChartTheme().primary : getChartTheme().destructive}">`
              + `${delta >= 0 ? "▲" : "▼"} ${fmt.format(Math.abs(delta))} so trước</span>`;
          const cumul = counts.slice(0, idx + 1).reduce((a, b) => a + b, 0);
          return `<b>${params[0].name}</b>${weekday ? ` (${weekday})` : ""}<br/>`
            + `${fmt.format(val)} hoạt động${deltaHtml}<br/>`
            + `<span style="color:${getChartTheme().mutedText}">Tích lũy: ${fmt.format(cumul)}</span>`;
        },
      },
      grid: { left: "2%", right: "2%", bottom: "3%", top: "8%", containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: {
          rotate: period === "month" ? 0 : 30,
          fontSize: 10,
          interval: labels.length > 20 ? Math.ceil(labels.length / 12) - 1 : 0,
        },
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { type: "dashed", color: getChartTheme().gridLineColor } },
      },
      series: [{
        type: "line",
        data: counts,
        smooth: !hasSparse,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { color: "#8b5cf6", width: 2 },
        itemStyle: { color: "#8b5cf6" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(139,92,246,0.28)" },
            { offset: 1, color: "rgba(139,92,246,0)" },
          ]),
        },
        markPoint: total > 0 ? {
          data: [{ type: "max", name: "Đỉnh" }],
          label: { fontSize: 10, color: "#fff", formatter: "{c}" },
          itemStyle: { color: "#8b5cf6" },
          symbolSize: 36,
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
  }, [data, counts, period, total]);

  const insight     = React.useMemo(() => data ? dayInsight(data, period) : "", [data, period]);
  const rangeLabel  = describeStatsRange(dateRange);
  const periodLabel = period === "day" ? "ngày" : period === "week" ? "tuần" : "tháng";

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-1 gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Xu hướng hoạt động
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rangeLabel} · Tổng hoạt động mỗi {periodLabel}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            {(["day", "week", "month"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  period === p ? "bg-violet-500 text-white" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {p === "day" ? "Ngày" : p === "week" ? "Tuần" : "Tháng"}
              </button>
            ))}
          </div>
        </div>

        {/* KPI row */}
        {data !== null && total > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 my-3">
            <div>
              <p className="text-xs text-muted-foreground">Tổng</p>
              <p className="text-xl font-bold tabular-nums">{fmt.format(total)}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">TB/{periodLabel}</p>
              <p className="text-xl font-bold tabular-nums">{avg.toFixed(1)}</p>
            </div>
            {peakIdx >= 0 && data[peakIdx] && (
              <>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-xs text-muted-foreground">Đỉnh</p>
                  <p className="text-xl font-bold tabular-nums text-violet-600">
                    {formatDayLabel(data[peakIdx].day, period)} · {fmt.format(counts[peakIdx])}
                  </p>
                </div>
              </>
            )}
            {trendBadge && (
              <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                trendBadge.up
                  ? "bg-success-bg text-success"
                  : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
              }`}>
                {trendBadge.up ? "↑" : "↓"} {trendBadge.text}
              </span>
            )}
          </div>
        )}

        {/* Chart */}
        {data === null ? (
          <Skeleton className="w-full h-[200px]" />
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">Chưa có dữ liệu</p>
        ) : (
          <div ref={chartRef} style={{ width: "100%", height: 200 }} />
        )}

        {/* Insight */}
        {insight && (
          <p className="text-xs text-muted-foreground italic mt-2">💡 {insight}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityDayCard;
