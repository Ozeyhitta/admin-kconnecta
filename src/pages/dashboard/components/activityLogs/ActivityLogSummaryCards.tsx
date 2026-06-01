import * as React from "react";
import { AlertTriangle, Ban, LogIn, ShieldAlert, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityLogSummary } from "./types";

const fmt = new Intl.NumberFormat("vi-VN");

interface Props {
  summary: ActivityLogSummary | null | undefined;
  loading?: boolean;
}

export const ActivityLogSummaryCards = ({ summary, loading }: Props) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
    <SummaryCard icon={Activity} title="Tổng log" value={summary?.totalLogs} loading={loading} color="text-indigo-500" />
    <SummaryCard icon={LogIn} title="Đăng nhập thất bại" value={summary?.failedLoginCount} loading={loading} color="text-red-500" />
    <SummaryCard icon={Ban} title="Tin nhắn bị chặn" value={summary?.blockedMessageCount} loading={loading} color="text-orange-500" />
    <SummaryCard icon={ShieldAlert} title="Hoạt động đáng ngờ" value={summary?.suspiciousActivityCount} loading={loading} color="text-amber-500" />
    <SummaryCard
      icon={AlertTriangle}
      title="User tích cực nhất"
      value={summary?.topActiveUserLogCount}
      loading={loading}
      color="text-violet-500"
      sub={summary?.topActiveUserFullName ?? summary?.topActiveUser ?? undefined}
    />
  </div>
);

const SummaryCard = ({
  icon: Icon,
  title,
  value,
  loading,
  color,
  sub,
}: {
  icon: React.FC<{ className?: string }>;
  title: string;
  value?: number;
  loading?: boolean;
  color: string;
  sub?: string;
}) => (
  <Card className="p-3">
    <div className="flex items-start justify-between gap-1">
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{title}</p>
        {loading ? (
          <Skeleton className="h-6 w-10 mt-1" />
        ) : (
          <p className="text-lg font-bold tabular-nums mt-0.5">{value !== undefined ? fmt.format(value) : "—"}</p>
        )}
        {sub && !loading && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={sub}>{sub}</p>
        )}
      </div>
      <Icon className={`h-4 w-4 shrink-0 opacity-50 ${color}`} />
    </div>
  </Card>
);

export default ActivityLogSummaryCards;
