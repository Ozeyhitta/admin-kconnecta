import { useCallback, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Wifi,
  FileText,
  MessageSquare,
  Flag,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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

// ─── Card ─────────────────────────────────────────────────────────────────────

interface OverviewCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>;
  iconColor: string;
  label: string;
  value: number | undefined;
  sub?: string;
  loading: boolean;
  pulse?: boolean;
  alert?: boolean;
}

const fmt = new Intl.NumberFormat("vi-VN");

const OverviewCard = ({ icon: Icon, iconColor, label, value, sub, loading, pulse, alert }: OverviewCardProps) => (
  <Card className={`flex-1 min-w-[140px] p-4 ${alert && value ? "border-orange-300 dark:border-orange-700" : ""}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        {loading ? (
          <Skeleton className="h-8 w-14 mt-1" />
        ) : (
          <p className={`text-2xl font-bold tabular-nums mt-1 ${alert && value ? "text-orange-500" : ""}`}>
            {value !== undefined ? fmt.format(value) : "—"}
          </p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="relative shrink-0">
        <Icon className={`h-7 w-7 mt-0.5 opacity-55 ${iconColor}`} />
        {pulse && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </span>
        )}
      </div>
    </div>
  </Card>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export const SystemOverviewCards = () => {
  const [data, setData]         = useState<SystemOverview | undefined>();
  const [loading, setLoading]   = useState(true);
  // Online users tracked separately with a faster interval
  const [onlineNow, setOnlineNow] = useState<number | undefined>();

  // Static counts — poll every 5 minutes (they rarely change)
  const fetchSystem = useCallback(async () => {
    try {
      const r = await apiClient.get<SystemOverview>("/api/v1/admin/stats/system-overview");
      setData(r.data);
      setOnlineNow(r.data.onlineUsersNow); // seed realtime value from first load
    } catch {
      /* keep previous values */
    } finally {
      setLoading(false);
    }
  }, []);

  // Online users — poll every 15 seconds for realtime accuracy
  const fetchOnline = useCallback(async () => {
    try {
      const r = await apiClient.get<OnlineResponse>("/api/v1/admin/stats/online");
      setOnlineNow(r.data.online);
    } catch {
      /* keep previous value */
    }
  }, []);

  useIntervalPoll(fetchSystem, ADMIN_SYSTEM_POLL_MS, [fetchSystem]);
  useIntervalPoll(fetchOnline, ADMIN_ONLINE_POLL_MS,  [fetchOnline]);

  return (
    <div className="flex flex-wrap gap-3">
      <OverviewCard
        icon={Users}
        iconColor="text-blue-500"
        label="Tổng người dùng"
        value={data?.totalUsers}
        loading={loading}
      />
      <OverviewCard
        icon={UserCheck}
        iconColor="text-emerald-500"
        label="Đang hoạt động"
        value={data?.activeUsers}
        loading={loading}
      />
      <OverviewCard
        icon={Wifi}
        iconColor="text-green-500"
        label="Đang online"
        value={onlineNow}
        sub="cập nhật mỗi 15 giây"
        loading={loading}
        pulse
      />
      <OverviewCard
        icon={UserX}
        iconColor="text-red-400"
        label="Bị khoá"
        value={data?.lockedUsers}
        loading={loading}
      />
      <OverviewCard
        icon={FileText}
        iconColor="text-sky-500"
        label="Tổng bài viết"
        value={data?.totalPosts}
        loading={loading}
      />
      <OverviewCard
        icon={MessageSquare}
        iconColor="text-pink-500"
        label="Tổng bình luận"
        value={data?.totalComments}
        loading={loading}
      />
      <OverviewCard
        icon={Flag}
        iconColor="text-orange-500"
        label="Báo cáo bài viết"
        value={data?.totalReports}
        loading={loading}
        alert
      />
    </div>
  );
};

export default SystemOverviewCards;
