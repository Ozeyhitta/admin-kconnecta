import { useCallback, useEffect, useRef, useState } from "react";
import { ADMIN_STATS_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import { describeStatsRange, toStatsApiParams, type StatsDateRange } from "@/lib/statsDateRange";
import {
  UserPlus,
  LogIn,
  FileText,
  MessageSquare,
  Activity,
  TrendingUp,
  TrendingDown,
  Share2,
  Heart,
  UserPlus2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/services/axiosInstance";
import { RecentActivityLogs } from "./components/activityLogs/RecentActivityLogs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersLast30Days: number;
  newUsersThisWeek: number;
  newUsersLastWeek: number;
  userGrowthPercent: number;
  onlineUsersNow: number;
  activityToday: number;
  activityLast7Days: number;
  loginsToday: number;
  postsToday: number;
  commentsToday: number;
  sharesToday: number;
  reactionsToday: number;
  friendRequestsToday: number;
  postsThisWeek: number;
  postsLastWeek: number;
  postsGrowthPercent: number;
}

// ─── Growth badge ─────────────────────────────────────────────────────────────

const GrowthBadge = ({ value }: { value: number }) => {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>;
  title: string;
  value: number | undefined;
  sub?: string;
  iconColor?: string;
  loading?: boolean;
  growth?: number;
  pulse?: boolean;
}

const StatCard = ({
  icon: Icon,
  title,
  value,
  sub,
  iconColor = "text-primary",
  loading,
  growth,
  pulse,
}: StatCardProps) => (
  <Card className="flex-1 min-w-[150px] p-4">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground truncate">{title}</p>
        {loading ? (
          <Skeleton className="h-8 w-16 mt-1" />
        ) : (
          <p className="text-2xl font-bold mt-1 tabular-nums">{value ?? "—"}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          {!loading && growth !== undefined && <GrowthBadge value={growth} />}
        </div>
      </div>
      <div className="relative shrink-0">
        <Icon className={`h-7 w-7 mt-0.5 opacity-60 ${iconColor}`} />
        {pulse && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </span>
        )}
      </div>
    </div>
  </Card>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
    {title}
  </h2>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export const StatsOverview = ({ dateRange }: { dateRange: StatsDateRange }) => {
  const [stats, setStats] = useState<OverviewStats | undefined>();
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const rangeLabel = describeStatsRange(dateRange);
  const isFirstLoad = useRef(true);

  // Show skeleton only on filter change (not on background polls)
  useEffect(() => {
    if (isFirstLoad.current) return;
    setLoading(true);
    setStats(undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const fetchOverview = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await apiClient.get<OverviewStats>("/api/v1/admin/stats/overview", {
        params: toStatsApiParams(dateRange),
      });
      setStats(res.data);
    } catch {
      /* keep previous values on background refresh failure */
    } finally {
      setLoading(false);
      setIsFetching(false);
      isFirstLoad.current = false;
    }
  }, [dateRange]);

  useIntervalPoll(fetchOverview, ADMIN_STATS_POLL_MS, [fetchOverview]);

  const showComparison = dateRange.compareMode !== "none";

  return (
    <div className="mb-4 space-y-5">

      {/* ── Trong khoảng ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <SectionHeader title={`Trong khoảng ${rangeLabel}`} />
          {isFetching && !loading && (
            <span className="text-xs text-muted-foreground animate-pulse">Đang cập nhật...</span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <StatCard
            icon={UserPlus}
            title="Người dùng mới"
            value={stats?.newUsersLast30Days}
            loading={loading}
            iconColor="text-teal-500"
          />
          <StatCard
            icon={LogIn}
            title="Đăng nhập"
            value={stats?.loginsToday}
            loading={loading}
            iconColor="text-indigo-500"
          />
          <StatCard
            icon={Activity}
            title="Hoạt động"
            value={stats?.activityLast7Days}
            loading={loading}
            iconColor="text-purple-500"
          />
        </div>
      </section>

      {/* ── Tăng trưởng ────────────────────────────────────────────── */}
      {showComparison && (
        <section>
          <SectionHeader title="Tăng trưởng so với kỳ trước" />
          <div className="flex flex-wrap gap-3">
            <StatCard
              icon={UserPlus2}
              title="Người dùng mới"
              value={stats?.newUsersThisWeek}
              sub={`Kỳ trước: ${stats?.newUsersLastWeek ?? "—"}`}
              loading={loading}
              iconColor="text-violet-500"
              growth={stats?.userGrowthPercent}
            />
            <StatCard
              icon={FileText}
              title="Bài đăng mới"
              value={stats?.postsThisWeek}
              sub={`Kỳ trước: ${stats?.postsLastWeek ?? "—"}`}
              loading={loading}
              iconColor="text-sky-500"
              growth={stats?.postsGrowthPercent}
            />
          </div>
        </section>
      )}

      {/* ── Hoạt động hôm nay ──────────────────────────────────────── */}
      <section>
        <SectionHeader title={`Hoạt động trong khoảng ${rangeLabel}`} />
        <div className="flex flex-wrap gap-3">
          <StatCard
            icon={Activity}
            title="Tổng hoạt động"
            value={stats?.activityToday}
            loading={loading}
            iconColor="text-orange-500"
          />
          <StatCard
            icon={FileText}
            title="Bài đăng"
            value={stats?.postsToday}
            loading={loading}
            iconColor="text-sky-500"
          />
          <StatCard
            icon={MessageSquare}
            title="Bình luận"
            value={stats?.commentsToday}
            loading={loading}
            iconColor="text-pink-500"
          />
          <StatCard
            icon={Heart}
            title="Cảm xúc"
            value={stats?.reactionsToday}
            loading={loading}
            iconColor="text-red-400"
          />
          <StatCard
            icon={Share2}
            title="Chia sẻ"
            value={stats?.sharesToday}
            loading={loading}
            iconColor="text-yellow-500"
          />
          <StatCard
            icon={UserPlus2}
            title="Kết bạn"
            value={stats?.friendRequestsToday}
            loading={loading}
            iconColor="text-emerald-500"
          />
        </div>
      </section>

      {/* ── Hoạt động gần đây ──────────────────────────────────────── */}
      <section>
        <RecentActivityLogs dateRange={dateRange} compact />
      </section>
    </div>
  );
};

export default StatsOverview;
