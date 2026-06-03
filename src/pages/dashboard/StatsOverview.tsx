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
  Minus,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("vi-VN");
const fmtNum = (v: number | undefined) => (v !== undefined ? fmt.format(v) : "—");

/** Human-readable growth label: "Tăng X%", "Giảm X%", "Không thay đổi". */
const growthLabel = (percent: number): { text: string; up: boolean | null } => {
  if (percent === 0) return { text: "Không thay đổi", up: null };
  const abs = Math.abs(percent);
  const rounded = Number.isFinite(abs) ? `${Math.round(abs)}%` : "hoàn toàn mới";
  return percent > 0
    ? { text: `Tăng ${rounded}`, up: true }
    : { text: `Giảm ${rounded}`, up: false };
};

/** "Từ X lên/xuống Y <unit>." */
const interpretGrowth = (current: number, previous: number, unit: string): string => {
  if (current === previous) return "Không thay đổi so với kỳ trước.";
  const dir = current > previous ? "lên" : "xuống";
  return `Từ ${fmtNum(previous)} ${dir} ${fmtNum(current)} ${unit}.`;
};

// ─── GrowthTag ────────────────────────────────────────────────────────────────

const GrowthTag = ({ percent }: { percent: number }) => {
  const { text, up } = growthLabel(percent);
  if (up === null)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        <Minus className="h-3 w-3" /> {text}
      </span>
    );
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
      <Icon className="h-3 w-3" /> {text}
    </span>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>;
  title: string;
  value: number | undefined;
  description?: string;
  iconColor?: string;
  loading?: boolean;
  growthPercent?: number;
  growthInterpretation?: string;
  previousValue?: number;
}

const StatCard = ({
  icon: Icon,
  title,
  value,
  description,
  iconColor = "text-primary",
  loading,
  growthPercent,
  growthInterpretation,
  previousValue,
}: StatCardProps) => (
  <Card className="flex-1 min-w-[150px] p-4">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground truncate">{title}</p>
        {loading ? (
          <Skeleton className="h-8 w-16 mt-1" />
        ) : (
          <p className="text-2xl font-bold mt-1 tabular-nums">{fmtNum(value)}</p>
        )}
        {!loading && growthPercent !== undefined && (
          <div className="mt-1 space-y-0.5">
            <GrowthTag percent={growthPercent} />
            {previousValue !== undefined && (
              <p className="text-xs text-muted-foreground">Kỳ trước: {fmtNum(previousValue)}</p>
            )}
            {growthInterpretation && (
              <p className="text-xs text-muted-foreground italic">{growthInterpretation}</p>
            )}
          </div>
        )}
        {!loading && description && (
          <p className="text-xs text-muted-foreground mt-1 leading-snug">{description}</p>
        )}
      </div>
      <Icon className={`h-7 w-7 mt-0.5 opacity-60 shrink-0 ${iconColor}`} />
    </div>
  </Card>
);

// ─── SectionHeader ────────────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
    {title}
  </h2>
);

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = () => (
  <p className="text-sm text-muted-foreground py-3">
    Chưa có dữ liệu trong khoảng thời gian này.
  </p>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export const StatsOverview = ({ dateRange }: { dateRange: StatsDateRange }) => {
  const [stats, setStats]       = useState<OverviewStats | undefined>();
  const [loading, setLoading]   = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const rangeLabel  = describeStatsRange(dateRange);
  const isFirstLoad = useRef(true);

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
    } catch { /* keep previous values on background refresh failure */ }
    finally {
      setLoading(false);
      setIsFetching(false);
      isFirstLoad.current = false;
    }
  }, [dateRange]);

  useIntervalPoll(fetchOverview, ADMIN_STATS_POLL_MS, [fetchOverview]);

  const showComparison = dateRange.compareMode !== "none";

  // Empty state: treat as empty when all main counters are 0
  const hasData = loading || !stats
    ? true
    : (stats.newUsersLast30Days > 0 || stats.loginsToday > 0 || stats.activityLast7Days > 0);

  // Note: check if total activity > sum of visible detail items
  const detailSum = (stats?.postsToday ?? 0)
    + (stats?.commentsToday ?? 0)
    + (stats?.reactionsToday ?? 0)
    + (stats?.sharesToday ?? 0)
    + (stats?.friendRequestsToday ?? 0);
  const activityTotal    = stats?.activityToday ?? 0;
  const showActivityNote = !loading && stats && activityTotal > detailSum;

  return (
    <div className="mb-4 space-y-5">

      {/* ── Chỉ số chính ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <SectionHeader title={`Trong khoảng ${rangeLabel}`} />
          {isFetching && !loading && (
            <span className="text-xs text-muted-foreground animate-pulse">Đang cập nhật...</span>
          )}
        </div>

        {!loading && !hasData ? (
          <EmptyState />
        ) : (
          <div className="flex flex-wrap gap-3">
            <StatCard
              icon={UserPlus}
              title="Người dùng mới"
              value={stats?.newUsersLast30Days}
              loading={loading}
              iconColor="text-teal-500"
              description="Số tài khoản đăng ký mới trong khoảng thời gian đã chọn."
            />
            <StatCard
              icon={LogIn}
              title="Lượt đăng nhập"
              value={stats?.loginsToday}
              loading={loading}
              iconColor="text-indigo-500"
              description="Tổng số lượt đăng nhập trong khoảng thời gian đã chọn."
            />
            <StatCard
              icon={Activity}
              title="Tổng hoạt động"
              value={stats?.activityLast7Days}
              loading={loading}
              iconColor="text-purple-500"
              description="Tổng số hành động được ghi nhận trong khoảng thời gian đã chọn."
            />
          </div>
        )}
      </section>

      {/* ── Tăng trưởng ───────────────────────────────────────────────── */}
      {showComparison && (
        <section>
          <SectionHeader title="Tăng trưởng so với kỳ trước" />

          {!loading && !hasData ? (
            <EmptyState />
          ) : (
            <div className="flex flex-wrap gap-3">
              <StatCard
                icon={UserPlus2}
                title="Người dùng mới"
                value={stats?.newUsersThisWeek}
                loading={loading}
                iconColor="text-violet-500"
                previousValue={stats?.newUsersLastWeek}
                growthPercent={stats?.userGrowthPercent}
                growthInterpretation={
                  stats
                    ? interpretGrowth(stats.newUsersThisWeek, stats.newUsersLastWeek, "người dùng mới")
                    : undefined
                }
              />
              <StatCard
                icon={FileText}
                title="Bài đăng mới"
                value={stats?.postsThisWeek}
                loading={loading}
                iconColor="text-sky-500"
                previousValue={stats?.postsLastWeek}
                growthPercent={stats?.postsGrowthPercent}
                growthInterpretation={
                  stats
                    ? interpretGrowth(stats.postsThisWeek, stats.postsLastWeek, "bài đăng")
                    : undefined
                }
              />
            </div>
          )}
        </section>
      )}

      {/* ── Hoạt động chi tiết ────────────────────────────────────────── */}
      <section>
        <SectionHeader title={`Hoạt động trong khoảng ${rangeLabel}`} />

        {!loading && !hasData ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <StatCard
                icon={Activity}
                title="Tổng hoạt động"
                value={stats?.activityToday}
                loading={loading}
                iconColor="text-orange-500"
                description="Tổng số hành động của người dùng được ghi nhận trong khoảng thời gian đã chọn."
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

            {showActivityNote && (
              <p className="mt-2 text-xs text-muted-foreground italic">
                * Tổng hoạt động có thể bao gồm thêm các loại hành động khác ngoài các mục đang hiển thị.
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Hoạt động gần đây ─────────────────────────────────────────── */}
      <section>
        <RecentActivityLogs dateRange={dateRange} compact />
      </section>

    </div>
  );
};

export default StatsOverview;
