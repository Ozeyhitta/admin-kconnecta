import * as React from "react";
import * as echarts from "echarts";
import { attachChartDayInteraction } from "@/pages/stats/lib/chartDayInteraction";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { cachedApiGet, DETAIL_CACHE_TTL } from "@/services/apiGetCache";
import { toStatsApiParams, describeStatsRange, type StatsDateRange } from "@/lib/statsDateRange";
import { getPageContent } from "@/services/pagination";
import {
  AdminDetailModal,
  AdminDetailSidebar,
  InsightCard,
  MetricComparisonCard,
  MetricHeroCard,
  SectionCard,
} from "@/components/admin/admin-detail-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const fmt = new Intl.NumberFormat("vi-VN");
const dateFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" });

type ChartPoint = { date: string; label: string; count: number };

type Summary = {
  totalNewUsers: number;
  averagePerDay: number;
  peakDay: string | null;
  peakCount: number;
  previousPeriodCount: number;
  growthRate: number | null;
  trendStatus: string;
};

type Insight = { type: string; level: string; title: string; message: string };

type AnalyticsResponse = {
  summary: Summary;
  chartData: ChartPoint[];
  insights: Insight[];
};

type NewUserRecord = {
  id: string;
  fullName?: string | null;
  username?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: StatsDateRange;
  returnTo?: string;
};

function filterUsersInRange(users: NewUserRecord[], from: string, to: string) {
  const fromTime = new Date(`${from}T00:00:00`).getTime();
  const toTime = new Date(`${to}T23:59:59`).getTime();
  return users.filter((user) => {
    if (!user.createdAt) return false;
    const t = new Date(user.createdAt).getTime();
    return t >= fromTime && t <= toTime;
  });
}

async function fetchRecentNewUsers(from: string, to: string, limit = 20): Promise<NewUserRecord[]> {
  const { data } = await cachedApiGet<{
    content?: NewUserRecord[];
    items?: NewUserRecord[];
  }>("/api/v1/admin/users", {
    params: {
      page: 0,
      size: 100,
      sortBy: "createdAt",
      sortDir: "desc",
      role: "USER",
      createdFrom: from,
      createdTo: to,
    },
  }, DETAIL_CACHE_TTL);
  return filterUsersInRange(getPageContent<NewUserRecord>(data), from, to).slice(0, limit);
}

function NewUsersTrendMini({
  chartData,
  onDayClick,
}: {
  chartData: ChartPoint[];
  onDayClick?: (point: ChartPoint) => void;
}) {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInst = React.useRef<echarts.ECharts | null>(null);
  const chartDataRef = React.useRef<ChartPoint[]>([]);
  const onDayClickRef = React.useRef(onDayClick);

  React.useEffect(() => {
    onDayClickRef.current = onDayClick;
  }, [onDayClick]);

  React.useEffect(() => {
    if (!chartData.length || !chartRef.current) return;
    chartInst.current ??= echarts.init(chartRef.current);
    chartDataRef.current = chartData;
    chartInst.current.setOption({
      tooltip: { trigger: "axis" },
      grid: { left: "2%", right: "2%", bottom: "3%", top: "8%", containLabel: true },
      xAxis: {
        type: "category",
        data: chartData.map((p) => p.label),
        axisLabel: { fontSize: 10, rotate: chartData.length > 14 ? 30 : 0 },
        boundaryGap: false,
      },
      yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { type: "dashed" } } },
      series: [{
        type: "line",
        data: chartData.map((p) => p.count),
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { color: "#10b981", width: 2 },
        itemStyle: { color: "#10b981" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(16,185,129,0.2)" },
            { offset: 1, color: "rgba(16,185,129,0)" },
          ]),
        },
      }],
    }, true);

    const detach = attachChartDayInteraction(
      chartInst.current,
      () => chartDataRef.current,
      () => onDayClickRef.current,
    );

    const onResize = () => chartInst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      detach();
      window.removeEventListener("resize", onResize);
      chartInst.current?.dispose();
      chartInst.current = null;
    };
  }, [chartData]);

  if (!chartData.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Chưa có dữ liệu trong kỳ này.</p>;
  }

  return <div ref={chartRef} className="w-full h-[200px]" />;
}

function NewUserSidebarItem({
  user,
  onNavigate,
  returnTo,
}: {
  user: NewUserRecord;
  onNavigate?: () => void;
  returnTo?: string;
}) {
  const name = user.fullName ?? user.username ?? user.email ?? "Người dùng";
  return (
    <Link
      to={`/customers/${user.id}/show`}
      state={returnTo ? { returnTo } : undefined}
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
    >
      <Avatar className="size-9 shrink-0">
        <AvatarImage src={user.avatarUrl ?? undefined} alt={name} />
        <AvatarFallback className="text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground">
          {user.createdAt ? dateFmt.format(new Date(user.createdAt)) : "—"}
        </p>
      </div>
    </Link>
  );
}

export function NewUsersDetailDialog({ open, onOpenChange, dateRange, returnTo }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<AnalyticsResponse | null>(null);
  const [users, setUsers] = React.useState<NewUserRecord[]>([]);
  const [selectedChartDay, setSelectedChartDay] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setSelectedChartDay(null);
    }
  }, [open]);

  const handleChartDayClick = React.useCallback((point: ChartPoint) => {
    setSelectedChartDay((prev) => (prev === point.date ? null : point.date));
  }, []);

  const filteredUsers = React.useMemo(() => {
    if (!selectedChartDay) return users;
    return users.filter((user) => {
      if (!user.createdAt) return false;
      return user.createdAt.slice(0, 10) === selectedChartDay;
    });
  }, [selectedChartDay, users]);

  React.useEffect(() => {
    if (!open) {
      setData(null);
      setUsers([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setUsersLoading(true);
    setError(null);

    const params = toStatsApiParams(dateRange);

    void Promise.all([
      cachedApiGet<AnalyticsResponse>("/api/v1/admin/stats/new-users-analytics", {
        params: { groupBy: "day", ...params },
      }, DETAIL_CACHE_TTL),
      fetchRecentNewUsers(dateRange.from, dateRange.to),
    ])
      .then(([analyticsRes, userList]) => {
        if (cancelled) return;
        setData(analyticsRes.data);
        setUsers(userList);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setUsers([]);
          setError("Không tải được chi tiết người dùng mới.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setUsersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, dateRange]);

  const summary = data?.summary;

  const left = summary ? (
    <>
      <MetricHeroCard
        label="Người dùng mới"
        value={fmt.format(summary.totalNewUsers)}
        sub={
          summary.averagePerDay > 0
            ? `Trung bình ${fmt.format(summary.averagePerDay)} người/ngày`
            : undefined
        }
        badge={
          summary.trendStatus ? (
            <span className="text-xs font-medium text-muted-foreground">{summary.trendStatus}</span>
          ) : null
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricComparisonCard
          label="So với kỳ trước"
          value={fmt.format(summary.previousPeriodCount)}
          deltaPct={summary.growthRate}
          note="Số người dùng mới kỳ trước"
        />
        <MetricComparisonCard
          label="Ngày cao nhất"
          value={summary.peakCount > 0 ? fmt.format(summary.peakCount) : "—"}
          note={
            summary.peakDay
              ? new Date(summary.peakDay).toLocaleDateString("vi-VN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                })
              : "Chưa có đỉnh trong kỳ"
          }
        />
        <MetricComparisonCard
          label="Trung bình / ngày"
          value={fmt.format(summary.averagePerDay)}
        />
      </div>

      <SectionCard title="Xu hướng đăng ký">
        <p className="text-[10px] text-muted-foreground text-right mb-2">
          Nhấn điểm trên biểu đồ để lọc danh sách theo ngày
          {selectedChartDay ? ` · Đang lọc: ${new Date(`${selectedChartDay}T12:00:00`).toLocaleDateString("vi-VN")}` : ""}
        </p>
        <NewUsersTrendMini chartData={data?.chartData ?? []} onDayClick={handleChartDayClick} />
      </SectionCard>

      {data?.insights?.length ? (
        <InsightCard title="Nhận xét tự động">
          <ul className="space-y-2">
            {data.insights.map((insight) => (
              <li key={insight.type}>
                <span className="font-medium">{insight.title}: </span>
                {insight.message}
              </li>
            ))}
          </ul>
        </InsightCard>
      ) : null}
    </>
  ) : null;

  const sidebar = (
    <AdminDetailSidebar
      title="Tài khoản mới"
      subtitle={usersLoading ? "Đang tải…" : selectedChartDay
        ? `${fmt.format(filteredUsers.length)} trong ngày đã chọn`
        : `${fmt.format(filteredUsers.length)} gần đây`}
      viewAllHref="/customers"
      viewAllState={returnTo ? { returnTo } : undefined}
      onViewAll={() => onOpenChange(false)}
    >
      {usersLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Đang tải danh sách…
        </div>
      ) : filteredUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16 px-4">
          {selectedChartDay
            ? "Không có tài khoản mới trong ngày đã chọn."
            : "Không có tài khoản mới trong kỳ đã chọn."}
        </p>
      ) : (
        filteredUsers.map((user) => (
            <NewUserSidebarItem
              key={user.id}
              user={user}
              onNavigate={() => onOpenChange(false)}
              returnTo={returnTo}
            />
        ))
      )}
    </AdminDetailSidebar>
  );

  return (
    <AdminDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title="Chi tiết người dùng mới"
      description={`${describeStatsRange(dateRange)} · Đăng ký theo ngày tạo tài khoản`}
      loading={loading}
      error={error}
      left={left}
      sidebar={sidebar}
    />
  );
}
