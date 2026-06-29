import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
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
import { cachedApiGet, DASHBOARD_CACHE_TTL } from "@/services/apiGetCache";
import { InteractionDetailDialog } from "@/pages/stats/components/InteractionDetailDialog";
import { ActivityOverviewDetailDialog } from "./components/ActivityOverviewDetailDialog";
import { NewUsersDetailDialog } from "./components/NewUsersDetailDialog";
import { LoginDetailDialog } from "./components/LoginDetailDialog";
import { DashboardSectionHeader } from "./components/DashboardSectionHeader";
import {
  INTERACTION_TYPE_TO_ACTION,
  type InteractionBreakdownItem,
  type InteractionChartSelection,
  type StatsActiveFilters,
} from "@/pages/stats/types";
import { dashboardModalReturnHref } from "./lib/dashboardModalReturn";

const DEFAULT_ACTIVITY_FILTERS: StatsActiveFilters = {
  interactionType: "all",
  userSegment: "all",
  interactionSource: "all",
};

const CLICKABLE_ACTIVITY_TYPES = new Set([
  "Bài đăng",
  "Bình luận",
  "Cảm xúc",
  "Chia sẻ",
  "Kết bạn",
]);
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
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-success" : "text-red-500"}`}>
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
  onClick?: () => void;
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
  onClick,
}: StatCardProps) => {
  const clickable = Boolean(onClick) && !loading;

  const content = (
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
        {clickable && (
          <p className="text-[11px] text-primary mt-1.5">Nhấn để xem chi tiết</p>
        )}
      </div>
      <Icon className={`h-7 w-7 mt-0.5 opacity-60 shrink-0 ${iconColor}`} />
    </div>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-[150px] rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40 cursor-pointer"
      >
        {content}
      </button>
    );
  }

  return <Card className="flex-1 min-w-[150px] p-4">{content}</Card>;
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = () => (
  <p className="text-sm text-muted-foreground py-3">
    Chưa có dữ liệu trong khoảng thời gian này.
  </p>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export const StatsOverview = ({ dateRange }: { dateRange: StatsDateRange }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats]       = useState<OverviewStats | undefined>();
  const [loading, setLoading]   = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [totalDetailOpen, setTotalDetailOpen] = useState(false);
  const [newUsersDetailOpen, setNewUsersDetailOpen] = useState(false);
  const [loginDetailOpen, setLoginDetailOpen] = useState(false);
  const [selection, setSelection] = useState<InteractionChartSelection | null>(null);
  const rangeLabel  = describeStatsRange(dateRange);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const modal = searchParams.get("modal");
    if (!modal) return;
    if (modal === "activity-overview") {
      setTotalDetailOpen(true);
    } else if (modal === "new-users") {
      setNewUsersDetailOpen(true);
    } else if (modal === "login-detail") {
      setLoginDetailOpen(true);
    } else if (modal === "interaction-detail") {
      const type = searchParams.get("interactionType");
      const actionType = searchParams.get("actionType");
      if (type && actionType) {
        setSelection({ kind: "type", type, actionType });
        setDetailOpen(true);
      }
    } else {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("modal");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const openTypeDetail = useCallback((title: string) => {
    const actionType = INTERACTION_TYPE_TO_ACTION[title];
    if (!actionType) return;
    setSelection({ kind: "type", type: title, actionType });
    setDetailOpen(true);
  }, []);

  const handleOverviewTypeDrillDown = useCallback((item: InteractionBreakdownItem) => {
    openTypeDetail(item.type);
  }, [openTypeDetail]);

  const openTotalDetail = useCallback(() => {
    setTotalDetailOpen(true);
  }, []);

  const openNewUsersDetail = useCallback(() => {
    setNewUsersDetailOpen(true);
  }, []);

  const openLoginDetail = useCallback(() => {
    setLoginDetailOpen(true);
  }, []);

  const activityCardClick = useCallback((title: string) => {
    if (title === "Tổng hoạt động") {
      openTotalDetail();
      return;
    }
    if (CLICKABLE_ACTIVITY_TYPES.has(title)) {
      openTypeDetail(title);
    }
  }, [openTotalDetail, openTypeDetail]);

  useEffect(() => {
    if (isFirstLoad.current) return;
    setLoading(true);
    setStats(undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const fetchOverview = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await cachedApiGet<OverviewStats>("/api/v1/admin/stats/overview", {
        params: toStatsApiParams(dateRange),
      }, DASHBOARD_CACHE_TTL);
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
    <div className="mb-4 space-y-10">

      {/* ── Chỉ số chính ──────────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <DashboardSectionHeader title={`Trong khoảng ${rangeLabel}`} />
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
              onClick={openNewUsersDetail}
            />
            <StatCard
              icon={LogIn}
              title="Lượt đăng nhập"
              value={stats?.loginsToday}
              loading={loading}
              iconColor="text-indigo-500"
              description="Tổng số lượt đăng nhập trong khoảng thời gian đã chọn."
              onClick={openLoginDetail}
            />
            <StatCard
              icon={Activity}
              title="Tổng hoạt động"
              value={stats?.activityLast7Days}
              loading={loading}
              iconColor="text-purple-500"
              description="Tổng số hành động được ghi nhận trong khoảng thời gian đã chọn."
              onClick={openTotalDetail}
            />
          </div>
        )}
      </section>

      {/* ── Tăng trưởng ───────────────────────────────────────────────── */}
      {showComparison && (
        <section className="space-y-4">
          <DashboardSectionHeader title="Tăng trưởng so với kỳ trước" />

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
                onClick={openNewUsersDetail}
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
                onClick={() => openTypeDetail("Bài đăng")}
              />
            </div>
          )}
        </section>
      )}

      {/* ── Hoạt động chi tiết ────────────────────────────────────────── */}
      <section className="space-y-4">
        <DashboardSectionHeader title={`Hoạt động trong khoảng ${rangeLabel}`} />

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
                onClick={() => activityCardClick("Tổng hoạt động")}
              />
              <StatCard
                icon={FileText}
                title="Bài đăng"
                value={stats?.postsToday}
                loading={loading}
                iconColor="text-sky-500"
                onClick={() => activityCardClick("Bài đăng")}
              />
              <StatCard
                icon={MessageSquare}
                title="Bình luận"
                value={stats?.commentsToday}
                loading={loading}
                iconColor="text-pink-500"
                onClick={() => activityCardClick("Bình luận")}
              />
              <StatCard
                icon={Heart}
                title="Cảm xúc"
                value={stats?.reactionsToday}
                loading={loading}
                iconColor="text-red-400"
                onClick={() => activityCardClick("Cảm xúc")}
              />
              <StatCard
                icon={Share2}
                title="Chia sẻ"
                value={stats?.sharesToday}
                loading={loading}
                iconColor="text-yellow-500"
                onClick={() => activityCardClick("Chia sẻ")}
              />
              <StatCard
                icon={UserPlus2}
                title="Kết bạn"
                value={stats?.friendRequestsToday}
                loading={loading}
                iconColor="text-primary"
                onClick={() => activityCardClick("Kết bạn")}
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

      <InteractionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        dateRange={dateRange}
        activeFilters={DEFAULT_ACTIVITY_FILTERS}
        selection={selection}
        returnTo={
          selection?.kind === "type"
            ? dashboardModalReturnHref("interaction-detail", dateRange, {
                interactionType: selection.type,
                actionType: selection.actionType,
              })
            : undefined
        }
      />

      <ActivityOverviewDetailDialog
        open={totalDetailOpen}
        onOpenChange={setTotalDetailOpen}
        dateRange={dateRange}
        onTypeDrillDown={handleOverviewTypeDrillDown}
      />

      <NewUsersDetailDialog
        open={newUsersDetailOpen}
        onOpenChange={setNewUsersDetailOpen}
        dateRange={dateRange}
        returnTo={dashboardModalReturnHref("new-users", dateRange)}
      />

      <LoginDetailDialog
        open={loginDetailOpen}
        onOpenChange={setLoginDetailOpen}
        dateRange={dateRange}
        totalLogins={stats?.loginsToday}
        returnTo={dashboardModalReturnHref("login-detail", dateRange)}
      />

    </div>
  );
};

export default StatsOverview;
