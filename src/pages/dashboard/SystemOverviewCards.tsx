import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Users,
  UserCheck,
  UserX,
  Wifi,
  FileText,
  MessageSquare,
  Flag,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cachedApiGet,
  DASHBOARD_CACHE_TTL,
  LIVE_CACHE_TTL,
} from "@/services/apiGetCache";
import { ADMIN_ONLINE_POLL_MS, ADMIN_SYSTEM_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import { DashboardSectionHeader } from "./components/DashboardSectionHeader";
import { OnlineUsersDetailDialog } from "./components/OnlineUsersDetailDialog";
import { useSearchParams } from "react-router";
import { dashboardModalReturnHref } from "./lib/dashboardModalReturn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemOverview {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  onlineUsersNow: number;
  totalPosts: number;
  totalComments: number;
  totalReports: number;
}

interface OnlineResponse { online: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("vi-VN");
const fmtNum = (v: number | undefined) => (v !== undefined ? fmt.format(v) : "—");

function adminListLink(resource: string, filter?: Record<string, string>) {
  const path = `/${resource}`;
  if (!filter) return path;
  return `${path}?filter=${JSON.stringify(filter)}`;
}

// ─── Metric row inside a group card ──────────────────────────────────────────

interface MetricRowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>;
  iconColor: string;
  label: string;
  value: number | undefined;
  loading: boolean;
  pulse?: boolean;
  badge?: React.ReactNode;
  description: React.ReactNode;
  to?: string;
  onClick?: () => void;
}

const MetricRow = ({
  icon: Icon,
  iconColor,
  label,
  value,
  loading,
  pulse,
  badge,
  description,
  to,
  onClick,
}: MetricRowProps) => {
  const clickable = (Boolean(to) || Boolean(onClick)) && !loading;

  const inner = (
    <>
      <div className="relative shrink-0 mt-0.5">
        <Icon className={`h-5 w-5 opacity-60 ${iconColor}`} />
        {pulse && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary">
            <span className="absolute inset-0 rounded-full bg-primary motion-safe:animate-ping opacity-75" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{label}</span>
          {badge}
        </div>
        {loading ? (
          <Skeleton className="h-6 w-12 mt-0.5" />
        ) : (
          <p className="text-xl font-bold tabular-nums leading-tight">{fmtNum(value)}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        {clickable ? (
          <p className="text-[11px] text-primary mt-1.5">Nhấn để xem chi tiết</p>
        ) : null}
      </div>
    </>
  );

  if (clickable && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-3 py-3 border-b last:border-b-0 transition-colors hover:bg-muted/40 -mx-4 px-4 cursor-pointer text-left"
      >
        {inner}
      </button>
    );
  }

  if (clickable && to) {
    return (
      <Link
        to={to}
        className="flex items-start gap-3 py-3 border-b last:border-b-0 transition-colors hover:bg-muted/40 -mx-4 px-4 cursor-pointer"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      {inner}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export const SystemOverviewCards = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData]           = useState<SystemOverview | undefined>();
  const [loading, setLoading]     = useState(true);
  const [onlineNow, setOnlineNow] = useState<number | undefined>();
  const [onlineDetailOpen, setOnlineDetailOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("modal") !== "online-users") return;
    setOnlineDetailOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("modal");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const fetchSystem = useCallback(async () => {
    try {
      const r = await cachedApiGet<SystemOverview>(
        "/api/v1/admin/stats/system-overview",
        undefined,
        DASHBOARD_CACHE_TTL,
      );
      setData(r.data);
      setOnlineNow(r.data.onlineUsersNow);
    } catch { /* keep previous values */ }
    finally { setLoading(false); }
  }, []);

  const fetchOnline = useCallback(async () => {
    try {
      const r = await cachedApiGet<OnlineResponse>(
        "/api/v1/admin/stats/online",
        undefined,
        LIVE_CACHE_TTL,
      );
      setOnlineNow(r.data.online);
    } catch { /* keep previous value */ }
  }, []);

  useIntervalPoll(fetchSystem, ADMIN_SYSTEM_POLL_MS, [fetchSystem]);
  useIntervalPoll(fetchOnline, ADMIN_ONLINE_POLL_MS, [fetchOnline]);

  const locked  = data?.lockedUsers;
  const reports = data?.totalReports;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-10">

        {/* ── Nhóm 1: Người dùng ─────────────────────────────────────── */}
        <section className="space-y-4">
          <DashboardSectionHeader
            title="Người dùng"
            subtitle="Tổng quan tài khoản và trạng thái hoạt động"
          />
        <Card className="flex flex-col">
          <CardContent className="flex-1 px-4 py-4">
            <MetricRow
              icon={Users}
              iconColor="text-blue-500"
              label="Tổng người dùng"
              value={data?.totalUsers}
              loading={loading}
              description="Tổng số tài khoản đã đăng ký trên hệ thống."
              to={adminListLink("customers")}
            />
            <MetricRow
              icon={UserCheck}
              iconColor="text-primary"
              label="Tài khoản hoạt động"
              value={data?.activeUsers}
              loading={loading}
              description="Tài khoản chưa bị khóa và còn có thể sử dụng hệ thống."
              to={adminListLink("customers", { status: "ACTIVE" })}
            />
            <MetricRow
              icon={Wifi}
              iconColor="text-primary"
              label="Đang online"
              value={onlineNow}
              loading={loading}
              pulse
              description="Số người dùng đang online tại thời điểm hiện tại."
              onClick={() => setOnlineDetailOpen(true)}
            />
            <MetricRow
              icon={UserX}
              iconColor="text-red-400"
              label="Bị khóa"
              value={locked}
              loading={loading}
              description={
                !loading && locked === 0
                  ? "Không có tài khoản bị khóa."
                  : "Số tài khoản đã bị admin hoặc hệ thống khóa."
              }
              to={adminListLink("customers", { status: "BLOCKED" })}
            />
          </CardContent>
          <CardFooter className="pt-3 pb-4 px-4">
            <Button variant="outline" size="sm" className="w-full gap-1.5" asChild>
              <Link to="/customers">
                Quản lý người dùng
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        </section>

        {/* ── Nhóm 2: Nội dung ────────────────────────────────────────── */}
        <section className="space-y-4">
          <DashboardSectionHeader
            title="Nội dung"
            subtitle="Bài viết và bình luận trên hệ thống"
          />
        <Card className="flex flex-col">
          <CardContent className="flex-1 px-4 py-4">
            <MetricRow
              icon={FileText}
              iconColor="text-sky-500"
              label="Tổng bài viết"
              value={data?.totalPosts}
              loading={loading}
              description="Tổng số bài viết đã được tạo trên hệ thống."
              to={adminListLink("posts")}
            />
            <MetricRow
              icon={MessageSquare}
              iconColor="text-pink-500"
              label="Tổng bình luận"
              value={data?.totalComments}
              loading={loading}
              description="Tổng số bình luận đã được tạo trên hệ thống."
              to={adminListLink("comments")}
            />
          </CardContent>
          <CardFooter className="pt-3 pb-4 px-4">
            <Button variant="outline" size="sm" className="w-full gap-1.5" asChild>
              <Link to="/posts">
                Quản lý bài viết
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        </section>

        {/* ── Nhóm 3: Kiểm duyệt ──────────────────────────────────────── */}
        <section className="space-y-4">
          <DashboardSectionHeader
            title="Kiểm duyệt"
            subtitle="Báo cáo vi phạm cần xử lý"
          />
        <Card className={`flex flex-col ${!loading && reports && reports > 0 ? "border-orange-300 dark:border-orange-700" : ""}`}>
          <CardContent className="flex-1 px-4 py-4">
            <MetricRow
              icon={Flag}
              iconColor="text-orange-500"
              label="Báo cáo bài viết"
              value={reports}
              loading={loading}
              badge={
                !loading && reports !== undefined && reports > 0 ? (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                    Cần xử lý
                  </Badge>
                ) : undefined
              }
              description={
                loading ? "Đang tải..." :
                reports === 0
                  ? "Không có báo cáo đang chờ xử lý."
                  : "Có báo cáo cần kiểm tra."
              }
              to={adminListLink("post-reports")}
            />
          </CardContent>
          <CardFooter className="pt-3 pb-4 px-4">
            <Button
              variant={!loading && reports && reports > 0 ? "default" : "outline"}
              size="sm"
              className="w-full gap-1.5"
              asChild
            >
              <Link to="/post-reports">
                Xem báo cáo
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        </section>

      </div>

      <p className="text-xs text-muted-foreground">
        Các số liệu được cập nhật tự động mỗi 15 giây.
      </p>

      <OnlineUsersDetailDialog
        open={onlineDetailOpen}
        onOpenChange={setOnlineDetailOpen}
        returnTo={dashboardModalReturnHref("online-users")}
        fallbackCount={onlineNow}
      />
    </div>
  );
};

export default SystemOverviewCards;
