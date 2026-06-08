import * as React from "react";
import * as echarts from "echarts";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Activity,
  Flag,
  Hash,
  AlertTriangle,
  Flame,
  MessageSquareWarning,
  Rocket,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { apiClient } from "@/services/axiosInstance";

// ─── API response types (mirror the Spring DTOs) ────────────────────────────

type Range = "7d" | "30d";

interface AnalyticsSummary {
  range: string;
  totalPosts: number;
  totalInteractions: number;
  totalReports: number;
  totalTopics: number;
  totalAlerts: number;
  topTopic: string | null;
  topTopicScore: number;
  avgTrendScore: number;
  generatedAt: string;
}

interface TopicTrend {
  topic: string;
  postCount: number;
  topicScore: number;
  previousScore: number;
  growthRate: number;
  trendLabel: string;
  reportCount: number;
  commentCount: number;
}

interface TopPost {
  postId: string;
  content: string;
  authorId: string | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  status: string | null;
  createdAt: string;
  trendScore: number;
  previousScore: number;
  growthRate: number;
  trendLabel: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  reportCount: number;
  topics: string[];
}

interface TrendAlert {
  id: string;
  type: string;
  severity: "HIGH" | "MEDIUM" | "INFO";
  scope: string;
  targetId: string;
  targetLabel: string;
  title: string;
  message: string;
  metrics: Record<string, unknown>;
}

interface ChartData {
  topicBar: { topic: string; score: number; postCount: number }[];
  topicDaily: { dates: string[]; series: { topic: string; data: number[] }[] };
}

interface PostTrendsResponse {
  summary: AnalyticsSummary;
  topicTrends: TopicTrend[];
  topPosts: TopPost[];
  alerts: TrendAlert[];
  chartData: ChartData;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("vi-VN");

/** Tailwind classes for the trend label badge. */
const trendLabelClass = (label: string): string => {
  switch (label) {
    case "Tăng mạnh":
      return "bg-success-bg text-success border-success-border font-semibold";
    case "Tăng":
      return "bg-success-bg text-success border-success-border";
    case "Giảm":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

// echarts palette shared by the bar + line charts so each topic keeps one colour.
const PALETTE = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#0ea5e9",
];

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

// ─── Summary card ──────────────────────────────────────────────────────────

interface KpiCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>;
  iconColor: string;
  title: string;
  value: number | string | undefined;
  sub?: string;
  loading?: boolean;
}

const KpiCard = ({ icon: Icon, iconColor, title, value, sub, loading }: KpiCardProps) => (
  <Card className="flex-1 min-w-[160px] p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        {loading ? (
          <Skeleton className="h-9 w-20 mt-1" />
        ) : (
          <p className="text-3xl font-bold mt-1 tabular-nums truncate">
            {value !== undefined ? (typeof value === "number" ? fmt.format(value) : value) : "—"}
          </p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
      <Icon className={`h-8 w-8 shrink-0 opacity-55 ${iconColor}`} />
    </div>
  </Card>
);

// ─── Bar chart: top topics by score ──────────────────────────────────────────

const TopicBarChart = ({ data }: { data: ChartData["topicBar"] | null }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<echarts.ECharts | null>(null);
  const dataKey = data === null ? "" : JSON.stringify(data);

  React.useEffect(() => {
    if (!data || data.length === 0 || !ref.current) return;
    inst.current ??= echarts.init(ref.current);

    inst.current.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (p: { name: string; value: number }[]) =>
          `#${p[0].name}: <b>${fmt.format(p[0].value)}</b> điểm`,
      },
      grid: { left: "1%", right: "3%", bottom: "3%", top: "6%", containLabel: true },
      xAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } } },
      yAxis: {
        type: "category",
        // echarts renders the first category at the bottom; reverse so the biggest is on top.
        data: [...data].reverse().map(d => `#${d.topic}`),
        axisLabel: { fontSize: 11 },
      },
      series: [{
        type: "bar",
        data: [...data].reverse().map((d, i) => ({
          value: d.score,
          itemStyle: { color: PALETTE[(data.length - 1 - i) % PALETTE.length] },
        })),
        barMaxWidth: 22,
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: "right", fontSize: 10, formatter: (p: { value: number }) => fmt.format(p.value) },
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

  if (data === null) return <Skeleton className="w-full h-[320px]" />;
  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-24">Chưa có dữ liệu</p>;
  return <div ref={ref} style={{ width: "100%", height: 320 }} />;
};

// ─── Line chart: topic score per day ──────────────────────────────────────────

const TopicLineChart = ({ data }: { data: ChartData["topicDaily"] | null }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<echarts.ECharts | null>(null);
  const dataKey = data === null ? "" : JSON.stringify(data);

  React.useEffect(() => {
    if (!data || data.series.length === 0 || !ref.current) return;
    inst.current ??= echarts.init(ref.current);

    inst.current.setOption({
      color: PALETTE,
      tooltip: { trigger: "axis" },
      legend: {
        data: data.series.map(s => `#${s.topic}`),
        bottom: 0,
        type: "scroll",
        textStyle: { fontSize: 11 },
      },
      grid: { left: "1%", right: "2%", bottom: "12%", top: "6%", containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.dates.map(formatDay),
        axisLabel: { rotate: data.dates.length > 14 ? 40 : 0, fontSize: 10 },
      },
      yAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } } },
      series: data.series.map(s => ({
        name: `#${s.topic}`,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        data: s.data,
      })),
    }, true);

    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      inst.current?.dispose();
      inst.current = null;
    };
  }, [dataKey, data]);

  if (data === null) return <Skeleton className="w-full h-[320px]" />;
  if (data.series.length === 0) return <p className="text-sm text-muted-foreground text-center py-24">Chưa có dữ liệu</p>;
  return <div ref={ref} style={{ width: "100%", height: 320 }} />;
};

// ─── Alerts box ───────────────────────────────────────────────────────────────

const ALERT_ICON: Record<string, React.FC<{ className?: string }>> = {
  REPORT_SPIKE: Flag,
  CONTROVERSIAL: MessageSquareWarning,
  VIRAL_POST: Flame,
  TOPIC_SURGE: Rocket,
};

const severityStyle = (severity: TrendAlert["severity"]) => {
  switch (severity) {
    case "HIGH":
      return { box: "border-red-200 bg-red-50", icon: "text-red-500", badge: "bg-red-100 text-red-700" };
    case "MEDIUM":
      return { box: "border-amber-200 bg-amber-50", icon: "text-amber-500", badge: "bg-amber-100 text-amber-700" };
    default:
      return { box: "border-blue-200 bg-blue-50", icon: "text-blue-500", badge: "bg-blue-100 text-blue-700" };
  }
};

const AlertsBox = ({ alerts, loading }: { alerts: TrendAlert[]; loading: boolean }) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success-border bg-success-bg p-4 text-sm text-success-on-bg">
        <Activity className="h-4 w-4" /> Không có cảnh báo nào trong kỳ này.
      </div>
    );
  }
  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
      {alerts.map(a => {
        const s = severityStyle(a.severity);
        const Icon = ALERT_ICON[a.type] ?? AlertTriangle;
        return (
          <div key={a.id} className={`flex gap-3 rounded-lg border p-3 ${s.box}`}>
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${s.icon}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{a.title}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${s.badge}`}>{a.severity}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1 truncate">↳ {a.targetLabel}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const PostTrendsPage = () => {
  const [range, setRange] = React.useState<Range>("7d");
  const [data, setData] = React.useState<PostTrendsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .get<PostTrendsResponse>("/api/v1/admin/analytics/post-trends", { params: { range } })
      .then(r => { if (!cancelled) setData(r.data); })
      .catch(() => { if (!cancelled) { setData(null); setError("Không tải được dữ liệu phân tích."); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  const summary = data?.summary;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbPage>Phân tích xu hướng bài viết</BreadcrumbPage>
      </Breadcrumb>

      <div className="space-y-6 mb-6">
        {/* ── Range toggle ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            Điểm xu hướng = like×1 + comment×2 + share×3 − report×5. So sánh với kỳ liền trước.
          </p>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(["7d", "30d"] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`cursor-pointer rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  range === r ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "7d" ? "7 ngày" : "30 ngày"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* ── Summary cards ────────────────────────────────────────── */}
        <section className="flex flex-wrap gap-3">
          <KpiCard icon={FileText} iconColor="text-indigo-500" title="Bài viết phân tích" value={summary?.totalPosts} loading={loading} />
          <KpiCard icon={Activity} iconColor="text-amber-500" title="Tổng tương tác" value={summary?.totalInteractions} loading={loading} />
          <KpiCard icon={Flag} iconColor="text-red-500" title="Tổng báo cáo" value={summary?.totalReports} loading={loading} />
          <KpiCard icon={Hash} iconColor="text-primary" title="Số chủ đề" value={summary?.totalTopics} loading={loading} />
          <KpiCard
            icon={TrendingUp}
            iconColor="text-blue-500"
            title="Chủ đề dẫn đầu"
            value={summary?.topTopic ? `#${summary.topTopic}` : "—"}
            sub={summary ? `${fmt.format(summary.topTopicScore)} điểm` : undefined}
            loading={loading}
          />
          <KpiCard icon={AlertTriangle} iconColor="text-orange-500" title="Cảnh báo" value={summary?.totalAlerts} loading={loading} />
        </section>

        {/* ── Charts ───────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Top chủ đề theo điểm xu hướng
              </h3>
              <TopicBarChart data={loading ? null : data?.chartData.topicBar ?? []} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Diễn biến chủ đề theo ngày
              </h3>
              <TopicLineChart data={loading ? null : data?.chartData.topicDaily ?? null} />
            </CardContent>
          </Card>
        </section>

        {/* ── Alerts + Topic table ─────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Cảnh báo kiểm duyệt &amp; xu hướng
              </h3>
              <AlertsBox alerts={data?.alerts ?? []} loading={loading} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Bảng chủ đề nổi bật
              </h3>
              <TopicTrendTable topics={data?.topicTrends ?? []} loading={loading} />
            </CardContent>
          </Card>
        </section>

        {/* ── Top posts table ──────────────────────────────────────── */}
        <section>
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Bài viết nổi bật
              </h3>
              <TopPostsTable posts={data?.topPosts ?? []} loading={loading} />
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
};

// ─── Topic trend table ────────────────────────────────────────────────────────

const TopicTrendTable = ({ topics, loading }: { topics: TopicTrend[]; loading: boolean }) => {
  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>;
  if (topics.length === 0) return <p className="text-sm text-muted-foreground text-center py-10">Chưa có dữ liệu</p>;
  return (
    <div className="max-h-[420px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Chủ đề</TableHead>
            <TableHead className="text-right">Bài</TableHead>
            <TableHead className="text-right">Điểm</TableHead>
            <TableHead className="text-right">Tăng trưởng</TableHead>
            <TableHead className="text-right">Phân loại</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topics.map(t => (
            <TableRow key={t.topic}>
              <TableCell className="font-medium">#{t.topic}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt.format(t.postCount)}</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">{fmt.format(t.topicScore)}</TableCell>
              <TableCell className={`text-right tabular-nums font-medium ${t.growthRate >= 0 ? "text-success" : "text-red-500"}`}>
                <span className="inline-flex items-center gap-0.5 justify-end">
                  {t.growthRate >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {t.growthRate >= 0 ? "+" : ""}{t.growthRate.toFixed(1)}%
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className={trendLabelClass(t.trendLabel)}>{t.trendLabel}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// ─── Top posts table ──────────────────────────────────────────────────────────

const TopPostsTable = ({ posts, loading }: { posts: TopPost[]; loading: boolean }) => {
  if (loading) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (posts.length === 0) return <p className="text-sm text-muted-foreground text-center py-10">Chưa có dữ liệu</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[260px]">Bài viết</TableHead>
            <TableHead>Tác giả</TableHead>
            <TableHead className="text-right">Điểm</TableHead>
            <TableHead className="text-right">Tăng trưởng</TableHead>
            <TableHead className="text-right">👍</TableHead>
            <TableHead className="text-right">💬</TableHead>
            <TableHead className="text-right">🔁</TableHead>
            <TableHead className="text-right">🚩</TableHead>
            <TableHead className="text-right">Phân loại</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map(p => (
            <TableRow key={p.postId}>
              <TableCell>
                <p className="line-clamp-2 text-sm">{p.content || <span className="italic text-muted-foreground">(không có nội dung)</span>}</p>
                {p.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.topics.slice(0, 4).map(t => (
                      <span key={t} className="text-[10px] text-indigo-600 bg-indigo-50 rounded px-1">#{t}</span>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">{p.authorName ?? p.authorUsername ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">{fmt.format(p.trendScore)}</TableCell>
              <TableCell className={`text-right tabular-nums font-medium ${p.growthRate >= 0 ? "text-success" : "text-red-500"}`}>
                {p.growthRate >= 0 ? "+" : ""}{p.growthRate.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right tabular-nums">{fmt.format(p.likeCount)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt.format(p.commentCount)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt.format(p.shareCount)}</TableCell>
              <TableCell className={`text-right tabular-nums ${p.reportCount > 0 ? "text-red-500 font-semibold" : ""}`}>{fmt.format(p.reportCount)}</TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className={trendLabelClass(p.trendLabel)}>{p.trendLabel}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PostTrendsPage;
