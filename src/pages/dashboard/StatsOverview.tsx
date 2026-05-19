import { useCallback, useState } from "react";
import { useGetList } from "ra-core";
import { ADMIN_STATS_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import {
  Users,
  UserPlus,
  UserCheck,
  LogIn,
  FileText,
  MessageSquare,
  Activity,
  TrendingUp,
  TrendingDown,
  Share2,
  Heart,
  UserPlus2,
  Wifi,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/services/axiosInstance";

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

// ─── Action badge ─────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  LOGIN:               { label: "Đăng nhập",   variant: "default" },
  LOGOUT:              { label: "Đăng xuất",   variant: "secondary" },
  REGISTER:            { label: "Đăng ký",     variant: "default" },
  GOOGLE_LOGIN:        { label: "Google",      variant: "outline" },
  POST_CREATED:        { label: "Đăng bài",    variant: "default" },
  POST_DELETED:        { label: "Xóa bài",     variant: "destructive" },
  COMMENT_ADDED:       { label: "Bình luận",   variant: "secondary" },
  REACTION_ADDED:      { label: "Cảm xúc",     variant: "secondary" },
  POST_SHARED:         { label: "Chia sẻ",     variant: "outline" },
  FRIEND_REQUEST_SENT: { label: "Kết bạn",     variant: "outline" },
  FRIEND_ACCEPTED:     { label: "Chấp nhận",   variant: "default" },
  PASSWORD_CHANGED:    { label: "Đổi MK",      variant: "outline" },
  RESET_PASSWORD:      { label: "Reset MK",    variant: "outline" },
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
    {title}
  </h2>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export const StatsOverview = () => {
  const [stats, setStats] = useState<OverviewStats | undefined>();
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await apiClient.get<OverviewStats>("/api/v1/admin/stats/overview");
      setStats(res.data);
    } catch {
      setStats(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useIntervalPoll(fetchOverview, ADMIN_STATS_POLL_MS, [fetchOverview]);

  const { data: recentLogs, isPending: logsLoading } = useGetList(
    "activity-logs",
    {
      pagination: { page: 1, perPage: 10 },
      sort: { field: "createdAt", order: "DESC" },
    },
    {
      refetchInterval: ADMIN_STATS_POLL_MS,
      refetchIntervalInBackground: false,
    },
  );

  return (
    <div className="mb-4 space-y-5">

      {/* ── Người dùng ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Người dùng" />
        <div className="flex flex-wrap gap-3">
          <StatCard
            icon={Users}
            title="Tổng người dùng"
            value={stats?.totalUsers}
            loading={loading}
            iconColor="text-blue-500"
          />
          <StatCard
            icon={UserCheck}
            title="Đang hoạt động"
            value={stats?.activeUsers}
            loading={loading}
            iconColor="text-green-500"
          />
          <StatCard
            icon={Wifi}
            title="Đang online"
            value={stats?.onlineUsersNow}
            sub="cập nhật realtime"
            loading={loading}
            iconColor="text-emerald-500"
            pulse
          />
          <StatCard
            icon={UserPlus}
            title="Mới 30 ngày qua"
            value={stats?.newUsersLast30Days}
            loading={loading}
            iconColor="text-teal-500"
          />
          <StatCard
            icon={LogIn}
            title="Đăng nhập hôm nay"
            value={stats?.loginsToday}
            loading={loading}
            iconColor="text-indigo-500"
          />
        </div>
      </section>

      {/* ── Tăng trưởng tuần ───────────────────────────────────────── */}
      <section>
        <SectionHeader title="Tăng trưởng (tuần này so với tuần trước)" />
        <div className="flex flex-wrap gap-3">
          <StatCard
            icon={UserPlus2}
            title="Người dùng mới"
            value={stats?.newUsersThisWeek}
            sub={`Tuần trước: ${stats?.newUsersLastWeek ?? "—"}`}
            loading={loading}
            iconColor="text-violet-500"
            growth={stats?.userGrowthPercent}
          />
          <StatCard
            icon={FileText}
            title="Bài đăng mới"
            value={stats?.postsThisWeek}
            sub={`Tuần trước: ${stats?.postsLastWeek ?? "—"}`}
            loading={loading}
            iconColor="text-sky-500"
            growth={stats?.postsGrowthPercent}
          />
          <StatCard
            icon={Activity}
            title="Hoạt động 7 ngày"
            value={stats?.activityLast7Days}
            loading={loading}
            iconColor="text-purple-500"
          />
        </div>
      </section>

      {/* ── Hoạt động hôm nay ──────────────────────────────────────── */}
      <section>
        <SectionHeader title="Hoạt động hôm nay" />
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
        <SectionHeader title="Hoạt động gần đây" />
        <Card className="overflow-hidden">
          {logsLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-32 ml-auto" />
                </div>
              ))}
            </div>
          ) : !recentLogs || recentLogs.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Chưa có dữ liệu hoạt động</p>
          ) : (
            <div className="divide-y">
              {recentLogs.map((log) => {
                const cfg = ACTION_LABELS[log.actionType] ?? {
                  label: log.actionType,
                  variant: "outline" as const,
                };
                return (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="font-medium w-28 truncate shrink-0 text-foreground">
                      {log.username ?? "—"}
                    </span>
                    <Badge variant={cfg.variant} className="shrink-0 text-xs px-2 py-0">
                      {cfg.label}
                    </Badge>
                    {log.metadata && (
                      <span className="text-muted-foreground text-xs truncate hidden lg:block flex-1">
                        {log.metadata}
                      </span>
                    )}
                    <span className="text-muted-foreground text-xs shrink-0 ml-auto">
                      {log.createdAt ? dateFormatter.format(new Date(log.createdAt)) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
};

export default StatsOverview;
