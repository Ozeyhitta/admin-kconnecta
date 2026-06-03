import { useCallback, useState } from "react";
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/services/axiosInstance";
import { ADMIN_ONLINE_POLL_MS, ADMIN_SYSTEM_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";

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
}

const MetricRow = ({ icon: Icon, iconColor, label, value, loading, pulse, badge, description }: MetricRowProps) => (
  <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
    <div className="relative shrink-0 mt-0.5">
      <Icon className={`h-5 w-5 opacity-60 ${iconColor}`} />
      {pulse && (
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
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
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export const SystemOverviewCards = () => {
  const [data, setData]           = useState<SystemOverview | undefined>();
  const [loading, setLoading]     = useState(true);
  const [onlineNow, setOnlineNow] = useState<number | undefined>();

  const fetchSystem = useCallback(async () => {
    try {
      const r = await apiClient.get<SystemOverview>("/api/v1/admin/stats/system-overview");
      setData(r.data);
      setOnlineNow(r.data.onlineUsersNow);
    } catch { /* keep previous values */ }
    finally { setLoading(false); }
  }, []);

  const fetchOnline = useCallback(async () => {
    try {
      const r = await apiClient.get<OnlineResponse>("/api/v1/admin/stats/online");
      setOnlineNow(r.data.online);
    } catch { /* keep previous value */ }
  }, []);

  useIntervalPoll(fetchSystem, ADMIN_SYSTEM_POLL_MS, [fetchSystem]);
  useIntervalPoll(fetchOnline, ADMIN_ONLINE_POLL_MS, [fetchOnline]);

  const locked  = data?.lockedUsers;
  const reports = data?.totalReports;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Các số liệu được cập nhật tự động mỗi 15 giây.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* ── Nhóm 1: Người dùng ─────────────────────────────────────── */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Người dùng
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-4 py-0">
            <MetricRow
              icon={Users}
              iconColor="text-blue-500"
              label="Tổng người dùng"
              value={data?.totalUsers}
              loading={loading}
              description="Tổng số tài khoản đã đăng ký trên hệ thống."
            />
            <MetricRow
              icon={UserCheck}
              iconColor="text-emerald-500"
              label="Tài khoản hoạt động"
              value={data?.activeUsers}
              loading={loading}
              description="Tài khoản chưa bị khóa và còn có thể sử dụng hệ thống."
            />
            <MetricRow
              icon={Wifi}
              iconColor="text-green-500"
              label="Đang online"
              value={onlineNow}
              loading={loading}
              pulse
              description="Số người dùng đang online tại thời điểm hiện tại."
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

        {/* ── Nhóm 2: Nội dung ────────────────────────────────────────── */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-500" />
              Nội dung
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-4 py-0">
            <MetricRow
              icon={FileText}
              iconColor="text-sky-500"
              label="Tổng bài viết"
              value={data?.totalPosts}
              loading={loading}
              description="Tổng số bài viết đã được tạo trên hệ thống."
            />
            <MetricRow
              icon={MessageSquare}
              iconColor="text-pink-500"
              label="Tổng bình luận"
              value={data?.totalComments}
              loading={loading}
              description="Tổng số bình luận đã được tạo trên hệ thống."
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

        {/* ── Nhóm 3: Kiểm duyệt ──────────────────────────────────────── */}
        <Card className={`flex flex-col ${!loading && reports && reports > 0 ? "border-orange-300 dark:border-orange-700" : ""}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Flag className="h-4 w-4 text-orange-500" />
              Kiểm duyệt
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-4 py-0">
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

      </div>
    </div>
  );
};

export default SystemOverviewCards;
