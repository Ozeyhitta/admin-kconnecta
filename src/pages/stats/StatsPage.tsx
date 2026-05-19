import * as React from "react";
import * as echarts from "echarts";
import { Users, UserCheck, Activity, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { apiClient } from "@/services/axiosInstance";
import { ADMIN_CHARTS_POLL_MS, ADMIN_STATS_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DauMauData {
  dau: number;
  mau: number;
  dauMauRatio: number;
  dauTrend: { day: string; count: number }[];
}

interface DataPoint {
  period: string;
  count: number;
}

type Period = "day" | "week" | "month";

type DauTrendPoint = { day: string; count: number };

/** Stable fallback — inline `?? []` creates a new array every render and retriggers chart effects. */
const EMPTY_DAU_TREND: DauTrendPoint[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("vi-VN");

const formatLabel = (raw: string, period: Period): string => {
  const d = new Date(raw);
  if (period === "month") return d.toLocaleDateString("vi-VN", { month: "short", year: "numeric" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>;
  iconColor: string;
  title: string;
  value: number | string | undefined;
  sub?: string;
  loading?: boolean;
  growth?: number;
}

const KpiCard = ({ icon: Icon, iconColor, title, value, sub, loading, growth }: KpiCardProps) => (
  <Card className="flex-1 min-w-[160px] p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        {loading ? (
          <Skeleton className="h-9 w-20 mt-1" />
        ) : (
          <p className="text-3xl font-bold mt-1 tabular-nums">
            {value !== undefined ? (typeof value === "number" ? fmt.format(value) : value) : "—"}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 min-h-[18px]">
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          {!loading && growth !== undefined && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${growth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {growth >= 0 ? "+" : ""}{growth.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <Icon className={`h-8 w-8 shrink-0 opacity-55 ${iconColor}`} />
    </div>
  </Card>
);

// ─── DAU Trend Chart ──────────────────────────────────────────────────────────

const DauTrendChart = ({ data }: { data: DauTrendPoint[] | null }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<echarts.ECharts | null>(null);
  const dataKey = data === null || data.length === 0 ? "" : JSON.stringify(data);

  React.useEffect(() => {
    if (!data || !ref.current) return;
    inst.current ??= echarts.init(ref.current);

    inst.current.setOption({
      tooltip: {
        trigger: "axis",
        formatter: (p: { name: string; value: number }[]) =>
          `${p[0].name}: <b>${fmt.format(p[0].value)}</b> người dùng`,
      },
      grid: { left: "1%", right: "1%", bottom: "3%", top: "6%", containLabel: true },
      xAxis: {
        type: "category",
        data: data.map(d => new Date(d.day).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })),
        axisLabel: { rotate: 30, fontSize: 10 },
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } },
      },
      series: [{
        type: "line",
        data: data.map(d => d.count),
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { color: "#6366f1", width: 2.5 },
        itemStyle: { color: "#6366f1" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(99,102,241,0.28)" },
            { offset: 1, color: "rgba(99,102,241,0)" },
          ]),
        },
      }],
    }, true);

    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      inst.current?.dispose();
      inst.current = null;
    };
  }, [dataKey, data]);

  if (data === null) return <Skeleton className="w-full h-[200px]" />;
  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-16">Chưa có dữ liệu</p>;
  return <div ref={ref} style={{ width: "100%", height: 200 }} />;
};

// ─── Interaction Trend Chart ──────────────────────────────────────────────────

const InteractionChart = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<echarts.ECharts | null>(null);
  const [period, setPeriod] = React.useState<Period>("day");
  const [data, setData] = React.useState<DataPoint[] | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const r = await apiClient.get<DataPoint[]>("/api/v1/admin/stats/interactions", { params: { period } });
      setData(r.data);
    } catch {
      setData([]);
    }
  }, [period]);

  React.useEffect(() => {
    setData(null);
  }, [period]);

  useIntervalPoll(fetchData, ADMIN_CHARTS_POLL_MS, [fetchData]);

  React.useEffect(() => {
    if (!data || !ref.current) return;
    inst.current ??= echarts.init(ref.current);

    const labels = data.map(d => formatLabel(d.period, period));
    const counts = data.map(d => d.count);

    inst.current.setOption({
      tooltip: {
        trigger: "axis",
        formatter: (p: { name: string; value: number }[]) =>
          `${p[0].name}: <b>${fmt.format(p[0].value)}</b> tương tác`,
      },
      grid: { left: "1%", right: "1%", bottom: "3%", top: "6%", containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { rotate: period === "month" ? 0 : 30, fontSize: 10 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } },
      },
      series: [{
        type: "bar",
        data: counts,
        barMaxWidth: 32,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#f59e0b" },
            { offset: 1, color: "#fcd34d" },
          ]),
        },
      }],
    }, true);

    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      inst.current?.dispose();
      inst.current = null;
    };
  }, [data, period]);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Lượt tương tác
          </h3>
          <div className="flex gap-1">
            {(["day", "week", "month"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  period === p ? "bg-amber-400 text-white" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {p === "day" ? "Ngày" : p === "week" ? "Tuần" : "Tháng"}
              </button>
            ))}
          </div>
        </div>
        {data === null ? (
          <Skeleton className="w-full h-[200px]" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">Chưa có dữ liệu</p>
        ) : (
          <div ref={ref} style={{ width: "100%", height: 200 }} />
        )}
      </CardContent>
    </Card>
  );
};

// ─── DAU/MAU ratio gauge ──────────────────────────────────────────────────────

const RatioGauge = ({ ratio }: { ratio: number }) => {
  const pct = Math.min(ratio, 100);
  const color = pct >= 20 ? "#10b981" : pct >= 10 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums" style={{ color }}>{ratio.toFixed(1)}%</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">DAU / MAU</p>
      <p className="text-xs text-center font-medium" style={{ color }}>
        {pct >= 20 ? "Tốt" : pct >= 10 ? "Trung bình" : "Thấp"}
      </p>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const StatsPage = () => {
  const [dauMau, setDauMau] = React.useState<DauMauData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchDauMau = React.useCallback(async () => {
    try {
      const r = await apiClient.get<DauMauData>("/api/v1/admin/stats/dau-mau");
      setDauMau(r.data);
    } catch {
      setDauMau(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useIntervalPoll(fetchDauMau, ADMIN_CHARTS_POLL_MS, [fetchDauMau]);

  const dauTrendData = React.useMemo((): DauTrendPoint[] | null => {
    if (loading) return null;
    return dauMau?.dauTrend ?? EMPTY_DAU_TREND;
  }, [loading, dauMau?.dauTrend]);

  return (
    <>
      <Breadcrumb>
        <BreadcrumbPage>Thống kê &amp; Báo cáo</BreadcrumbPage>
      </Breadcrumb>

      <div className="space-y-6 mb-6">

        {/* ── DAU / MAU KPIs ──────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Người dùng hoạt động (DAU / MAU)
          </h2>
          <div className="flex flex-wrap gap-4 items-start">
            <div className="flex flex-wrap gap-3 flex-1">
              <KpiCard
                icon={UserCheck}
                iconColor="text-indigo-500"
                title="DAU — Hôm nay"
                value={dauMau?.dau}
                sub="Người dùng hoạt động trong ngày"
                loading={loading}
              />
              <KpiCard
                icon={Users}
                iconColor="text-blue-500"
                title="MAU — 30 ngày"
                value={dauMau?.mau}
                sub="Người dùng hoạt động trong tháng"
                loading={loading}
              />
              <KpiCard
                icon={Activity}
                iconColor="text-purple-500"
                title="Tổng hoạt động hôm nay"
                value={undefined}
                loading={loading}
              />
            </div>
            {!loading && dauMau && (
              <div className="flex items-center justify-center px-4">
                <RatioGauge ratio={dauMau.dauMauRatio} />
              </div>
            )}
            {loading && <Skeleton className="w-28 h-28 rounded-full" />}
          </div>
        </section>

        {/* ── DAU Trend ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Xu hướng DAU — 30 ngày qua
          </h2>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium">Người dùng hoạt động theo ngày</span>
              </div>
              <DauTrendChart data={dauTrendData} />
            </CardContent>
          </Card>
        </section>

        {/* ── Interaction Trend ────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Lượt tương tác &amp; Tăng trưởng
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InteractionChart />
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Breakdown loại tương tác (hôm nay)
                </h3>
                <InteractionBreakdown loading={loading} />
              </CardContent>
            </Card>
          </div>
        </section>

      </div>
    </>
  );
};

// ─── Interaction Breakdown (today, from overview) ─────────────────────────────

interface BreakdownItem { label: string; value: number; color: string }

const InteractionBreakdown = ({ loading }: { loading: boolean }) => {
  const [items, setItems] = React.useState<BreakdownItem[]>([]);

  const fetchBreakdown = React.useCallback(async () => {
    try {
      const r = await apiClient.get<{
        postsToday: number;
        commentsToday: number;
        reactionsToday: number;
        sharesToday: number;
        friendRequestsToday: number;
      }>("/api/v1/admin/stats/overview");
      const d = r.data;
      setItems([
        { label: "Bài đăng", value: d.postsToday, color: "#6366f1" },
        { label: "Bình luận", value: d.commentsToday, color: "#ec4899" },
        { label: "Cảm xúc", value: d.reactionsToday, color: "#ef4444" },
        { label: "Chia sẻ", value: d.sharesToday, color: "#f59e0b" },
        { label: "Kết bạn", value: d.friendRequestsToday, color: "#10b981" },
      ]);
    } catch {
      /* keep previous values */
    }
  }, []);

  useIntervalPoll(fetchBreakdown, ADMIN_STATS_POLL_MS, [fetchBreakdown]);

  const total = items.reduce((s, i) => s + i.value, 0);

  if (loading || items.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(item => {
        const pct = total === 0 ? 0 : Math.round((item.value / total) * 100);
        return (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{item.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {fmt.format(item.value)} <span className="text-xs">({pct}%)</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground text-right pt-1">Tổng: {fmt.format(total)}</p>
    </div>
  );
};

export default StatsPage;
