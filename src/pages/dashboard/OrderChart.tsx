import * as React from "react";
import { useSearchParams } from "react-router";
import * as echarts from "echarts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cachedApiGet, DASHBOARD_CACHE_TTL } from "@/services/apiGetCache";
import { ADMIN_CHARTS_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import { toStatsApiParams, describeStatsRange, formatDateInput, type StatsDateRange } from "@/lib/statsDateRange";
import { getChartTheme } from "@/lib/chartColors";
import { attachChartDayInteraction } from "@/pages/stats/lib/chartDayInteraction";
import { InteractionDetailDialog } from "@/pages/stats/components/InteractionDetailDialog";
import {
  ActivityHourDetailDialog,
  type HourChartSelection,
} from "@/pages/dashboard/components/ActivityHourDetailDialog";
import { dashboardModalReturnHref } from "./lib/dashboardModalReturn";
import { DashboardSectionHeader } from "@/pages/dashboard/components/DashboardSectionHeader";
import {
  INTERACTION_TYPE_TO_ACTION,
  type AnalyticsChartPoint,
  type InteractionChartSelection,
  type StatsActiveFilters,
} from "@/pages/stats/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HourData { hour: number; count: number }
interface DayData  { day: string;  count: number }
type Period = "day" | "week" | "month";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("vi-VN");
const CLICK_HINT = "<br/><span style=\"color:#94a3b8;font-size:11px\">Nhấn để xem chi tiết</span>";

const DEFAULT_ACTIVITY_FILTERS: StatsActiveFilters = {
  interactionType: "all",
  userSegment: "all",
  interactionSource: "all",
};

function toChartPoints(data: DayData[], period: Period): AnalyticsChartPoint[] {
  return data.map((d) => ({
    date: d.day.slice(0, 10),
    label: formatDayLabel(d.day, period),
    count: d.count,
  }));
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const chartRef  = React.useRef<HTMLDivElement>(null);
  const chartInst = React.useRef<echarts.ECharts | null>(null);
  const [hourData, setHourData] = React.useState<HourData[] | null>(null);
  const [selectedDay, setSelectedDay] = React.useState(dateRange.to);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [hourSelection, setHourSelection] = React.useState<HourChartSelection | null>(null);
  const [typeDetailOpen, setTypeDetailOpen] = React.useState(false);
  const [typeSelection, setTypeSelection] = React.useState<InteractionChartSelection | null>(null);

  React.useEffect(() => {
    if (searchParams.get("modal") !== "activity-hour") return;
    const hour = Number(searchParams.get("hour"));
    const selectedDate = searchParams.get("selectedDate");
    if (selectedDate) setSelectedDay(selectedDate);
    if (Number.isFinite(hour)) {
      setHourSelection({ hour, count: Number(searchParams.get("count") ?? 0) });
      setDetailOpen(true);
    }
    const next = new URLSearchParams(searchParams);
    next.delete("modal");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleHourTypeDrillDown = React.useCallback((type: string) => {
    const actionType = INTERACTION_TYPE_TO_ACTION[type];
    if (!actionType) return;
    setTypeSelection({ kind: "type", type, actionType });
    setTypeDetailOpen(true);
  }, []);

  React.useEffect(() => {
    setSelectedDay(dateRange.to);
  }, [dateRange.from, dateRange.to]);

  const fetchData = React.useCallback(async () => {
    try {
      const r = await cachedApiGet<HourData[]>("/api/v1/admin/stats/activity-by-hour", {
        params: { from: selectedDay, to: selectedDay },
      }, DASHBOARD_CACHE_TTL);
      setHourData(r.data);
    } catch {
      setHourData([]);
    }
  }, [selectedDay]);

  React.useEffect(() => { setHourData(null); }, [selectedDay]);
  useIntervalPoll(fetchData, ADMIN_CHARTS_POLL_MS, [fetchData]);

  const counts = React.useMemo(() =>
    hourData
      ? Array.from({ length: 24 }, (_, h) => hourData.find(d => d.hour === h)?.count ?? 0)
      : null,
  [hourData]);

  const total    = React.useMemo(() => counts?.reduce((a, b) => a + b, 0) ?? 0, [counts]);
  const peakHour = React.useMemo(() => {
    if (!counts || total === 0) return -1;
    return counts.indexOf(Math.max(...counts));
  }, [counts, total]);

  const hourChartPoints = React.useMemo((): AnalyticsChartPoint[] => {
    if (!counts) return [];
    return counts.map((count, hour) => ({
      date: String(hour),
      label: `${hour}h`,
      count,
    }));
  }, [counts]);

  const openHourDetail = React.useCallback((point: AnalyticsChartPoint) => {
    const hour = Number(point.date);
    if (Number.isNaN(hour)) return;
    setHourSelection({ hour, count: point.count });
    setDetailOpen(true);
  }, []);

  const onHourClick = total > 0 ? openHourDetail : undefined;
  const hourReturnTo = hourSelection
    ? dashboardModalReturnHref("activity-hour", dateRange, {
        selectedDate: selectedDay,
        hour: String(hourSelection.hour),
        count: String(hourSelection.count),
      })
    : undefined;
  const hourChartPointsRef = React.useRef(hourChartPoints);
  const onHourClickRef = React.useRef(onHourClick);
  hourChartPointsRef.current = hourChartPoints;
  onHourClickRef.current = onHourClick;

  const countsKey = counts === null ? "" : JSON.stringify({ counts, peakHour, selectedDay });

  React.useEffect(() => {
    if (!countsKey || !chartRef.current) return;

    chartInst.current ??= echarts.init(chartRef.current);

    const detachInteraction = attachChartDayInteraction(
      chartInst.current,
      () => hourChartPointsRef.current,
      () => onHourClickRef.current,
    );

    const onResize = () => chartInst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      detachInteraction();
      window.removeEventListener("resize", onResize);
      chartInst.current?.dispose();
      chartInst.current = null;
    };
  }, [countsKey]);

  React.useEffect(() => {
    if (!counts || !chartInst.current) return;

    const clickable = !!onHourClickRef.current;

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
          const clickHtml = clickable ? CLICK_HINT : "";
          return `<b>${h}:00 – ${h + 1}:00</b> (${session})<br/>`
            + `${fmt.format(val)} hoạt động · ${pct}% trong ngày${clickHtml}`;
        },
      },
      grid: { left: "2%", right: "2%", bottom: "3%", top: "4%", containLabel: true },
      xAxis: {
        type: "category",
        data: Array.from({ length: 24 }, (_, h) => `${h}h`),
        axisLabel: { interval: 1, fontSize: 11, padding: [6, 2, 0, 2] },
        triggerEvent: clickable,
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { type: "dashed", color: getChartTheme().gridLineColor } },
      },
      series: [{
        type: "bar",
        triggerEvent: clickable,
        barMaxWidth: 36,
        barMinWidth: 14,
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
  }, [countsKey, counts, peakHour, total]);

  const insight    = React.useMemo(() => counts ? hourInsight(counts) : "", [counts]);
  const rangeLabel = describeStatsRange(dateRange);
  const selectedDayLabel = new Date(`${selectedDay}T12:00:00`).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const today = formatDateInput(new Date());

  return (
    <>
    <section className="space-y-4">
      <DashboardSectionHeader
        title="Hoạt động theo giờ trong ngày"
        subtitle={`${rangeLabel} · Tổng của: đăng bài, bình luận, cảm xúc, chia sẻ, kết bạn`}
      />
    <Card>
      <CardContent className="pt-4">
        <div className="mb-2 flex flex-wrap items-end justify-end gap-3">
          <div className="flex flex-col gap-1 shrink-0">
            <label htmlFor="activity-hour-day" className="text-xs font-medium text-muted-foreground">
              Chọn ngày
            </label>
            <input
              id="activity-hour-day"
              type="date"
              value={selectedDay}
              min={dateRange.from}
              max={dateRange.to > today ? today : dateRange.to}
              onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          Đang xem: <span className="font-medium text-foreground">{selectedDayLabel}</span>
          {total > 0 && " · Nhấn cột để xem chi tiết"}
        </p>

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
          <p className="text-sm text-muted-foreground py-16 text-center">Chưa có dữ liệu trong ngày đã chọn</p>
        ) : (
          <div ref={chartRef} style={{ width: "100%", height: 220 }} />
        )}

        {/* Insight */}
        {insight && (
          <p className="text-xs text-muted-foreground italic mt-2">💡 {insight}</p>
        )}
      </CardContent>
    </Card>
    </section>

    <ActivityHourDetailDialog
      open={detailOpen}
      onOpenChange={setDetailOpen}
      dateRange={dateRange}
      selectedDate={selectedDay}
      selection={hourSelection}
      hourCounts={counts}
      peakHour={peakHour}
      rangeTotal={total}
      onTypeDrillDown={handleHourTypeDrillDown}
      returnTo={hourReturnTo}
    />

    <InteractionDetailDialog
      open={typeDetailOpen}
      onOpenChange={setTypeDetailOpen}
      dateRange={dateRange}
      activeFilters={DEFAULT_ACTIVITY_FILTERS}
      selection={typeSelection}
      returnTo={hourReturnTo}
    />
    </>
  );
};

// ─── ActivityDayCard ──────────────────────────────────────────────────────────

export const ActivityDayCard = ({ dateRange }: { dateRange: StatsDateRange }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const chartRef  = React.useRef<HTMLDivElement>(null);
  const chartInst = React.useRef<echarts.ECharts | null>(null);
  const [period, setPeriod]   = React.useState<Period>("day");
  const [rawData, setRawData] = React.useState<DayData[] | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selection, setSelection] = React.useState<InteractionChartSelection | null>(null);

  React.useEffect(() => {
    if (searchParams.get("modal") !== "activity-day") return;
    const date = searchParams.get("selectedDate");
    if (date) {
      setPeriod("day");
      setSelection({ kind: "day", date, label: searchParams.get("dayLabel") ?? date });
      setDetailOpen(true);
    }
    const next = new URLSearchParams(searchParams);
    next.delete("modal");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const fetchData = React.useCallback(async () => {
    try {
      const r = await cachedApiGet<DayData[]>("/api/v1/admin/stats/activity-by-day", {
        params: { period, ...toStatsApiParams(dateRange) },
      }, DASHBOARD_CACHE_TTL);
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
  const periodLabel = period === "day" ? "ngày" : period === "week" ? "tuần" : "tháng";

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

  const chartPoints = React.useMemo(
    () => (data ? toChartPoints(data, period) : []),
    [data, period],
  );
  const dayChartPoints = React.useMemo(
    () => (data && period === "day" ? toChartPoints(data, "day") : null),
    [data, period],
  );

  const openDayDetail = React.useCallback((point: AnalyticsChartPoint) => {
    setSelection({ kind: "day", date: point.date, label: point.label });
    setDetailOpen(true);
  }, []);

  const onDayClick = period === "day" ? openDayDetail : undefined;
  const dayReturnTo = selection?.kind === "day"
    ? dashboardModalReturnHref("activity-day", dateRange, {
        selectedDate: selection.date,
        dayLabel: selection.label,
      })
    : undefined;
  const chartPointsRef = React.useRef(chartPoints);
  const onDayClickRef = React.useRef(onDayClick);
  chartPointsRef.current = chartPoints;
  onDayClickRef.current = onDayClick;

  const dataKey = data === null ? "" : JSON.stringify({ data, period });

  React.useEffect(() => {
    if (!dataKey || !chartRef.current) return;

    chartInst.current ??= echarts.init(chartRef.current);

    const detachInteraction = attachChartDayInteraction(
      chartInst.current,
      () => chartPointsRef.current,
      () => onDayClickRef.current,
    );

    const onResize = () => chartInst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      detachInteraction();
      window.removeEventListener("resize", onResize);
      chartInst.current?.dispose();
      chartInst.current = null;
    };
  }, [dataKey]);

  React.useEffect(() => {
    if (!data || !chartInst.current) return;

    const labels    = data.map(d => formatDayLabel(d.day, period));
    const hasSparse = counts.filter(c => c > 0).length < counts.length * 0.3;
    const clickable = period === "day" && !!onDayClickRef.current;

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
              + `${delta >= 0 ? "▲" : "▼"} ${fmt.format(Math.abs(delta))} so với ngày trước</span>`;
          const avgHtml = avg > 0
            ? `<br/><span style="color:${getChartTheme().mutedText}">TB/${periodLabel}: ${avg.toFixed(1)} · ${val >= avg ? "trên" : "dưới"} trung bình</span>`
            : "";
          const peakHtml = idx === peakIdx && val > 0
            ? `<br/><span style="color:#f59e0b;font-weight:600">⭐ Cao nhất trong kỳ</span>`
            : "";
          const unit = period === "day" ? "hoạt động" : `hoạt động/${periodLabel}`;
          const clickHtml = clickable ? CLICK_HINT : "";
          return `<b>${params[0].name}</b>${weekday ? ` (${weekday})` : ""}<br/>`
            + `${fmt.format(val)} ${unit}${deltaHtml}${avgHtml}${peakHtml}${clickHtml}`;
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
        triggerEvent: clickable,
        showSymbol: clickable,
        data: counts.map((c, i) => ({
          value: c,
          symbolSize: clickable ? (i === peakIdx ? 12 : 8) : 4,
          itemStyle: {
            color: i === peakIdx && c > 0 ? "#f59e0b" : "#8b5cf6",
          },
        })),
        smooth: !hasSparse,
        symbol: "circle",
        lineStyle: { color: "#8b5cf6", width: 2 },
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
  }, [dataKey, data, counts, period, total, avg, peakIdx, periodLabel]);

  const insight     = React.useMemo(() => data ? dayInsight(data, period) : "", [data, period]);
  const rangeLabel  = describeStatsRange(dateRange);

  return (
    <>
    <section className="space-y-4">
      <DashboardSectionHeader
        title="Xu hướng hoạt động"
        subtitle={`${rangeLabel} · Tổng hoạt động mỗi ${periodLabel}`}
      />
    <Card>
      <CardContent className="pt-4">
        <div className="flex justify-end gap-1 shrink-0 mb-4">
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
          <div className="space-y-1">
            {period === "day" && (
              <p className="text-xs text-muted-foreground text-right">Nhấn biểu đồ để xem chi tiết</p>
            )}
            <div ref={chartRef} style={{ width: "100%", height: 200 }} />
          </div>
        )}

        {/* Insight */}
        {insight && (
          <p className="text-xs text-muted-foreground italic mt-2">💡 {insight}</p>
        )}
      </CardContent>
    </Card>
    </section>

    <InteractionDetailDialog
      open={detailOpen}
      onOpenChange={setDetailOpen}
      dateRange={dateRange}
      activeFilters={DEFAULT_ACTIVITY_FILTERS}
      selection={selection}
      chartData={dayChartPoints}
      averageInteractionsPerDay={avg}
      returnTo={dayReturnTo}
    />
    </>
  );
};

export default ActivityDayCard;
