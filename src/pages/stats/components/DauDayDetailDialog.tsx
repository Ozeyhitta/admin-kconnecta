import * as React from "react";
import { Link } from "react-router";
import { Loader2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AdminDetailModal,
  AdminDetailSidebar,
  InsightCard,
  MetricComparisonCard,
  MetricHeroCard,
} from "@/components/admin/admin-detail-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchDauDayUsers, type DauDayUser } from "../lib/fetchDauDayUsers";
import { resolveCustomerShowHref } from "../lib/customerLinks";
import type { AnalyticsChartPoint, DauMauSummary } from "../types";

const fmt = new Intl.NumberFormat("vi-VN");

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: AnalyticsChartPoint | null;
  chartData: AnalyticsChartPoint[] | null;
  summary: DauMauSummary | null;
};

export function DauDayDetailDialog({
  open,
  onOpenChange,
  selection,
  chartData,
  summary,
}: Props) {
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [usersError, setUsersError] = React.useState<string | null>(null);
  const [activeUsers, setActiveUsers] = React.useState<DauDayUser[]>([]);

  const detail = React.useMemo(() => {
    if (!selection || !chartData?.length) return null;

    const idx = chartData.findIndex((p) => p.date === selection.date);
    if (idx < 0) return null;

    const count = chartData[idx].count;
    const previousDayCount = idx > 0 ? chartData[idx - 1].count : null;
    const average = summary?.averageDau30Days
      ?? (chartData.reduce((sum, p) => sum + p.count, 0) / chartData.length);
    const maxCount = Math.max(...chartData.map((p) => p.count));
    const isPeak = count > 0 && count === maxCount
      && (summary?.peakDauDay == null || selection.date === summary.peakDauDay.slice(0, 10));

    const dateLabel = new Date(selection.date).toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return {
      count,
      dateLabel,
      previousDayCount,
      average,
      isPeak,
      previousDayPct: getChangePct(count, previousDayCount),
      averagePct: getChangePct(count, average),
      commentary: buildCommentary(count, previousDayCount, average, isPeak),
    };
  }, [chartData, selection, summary]);

  React.useEffect(() => {
    if (!open || !selection?.date) {
      setActiveUsers([]);
      setUsersError(null);
      return;
    }

    let cancelled = false;
    setUsersLoading(true);
    setUsersError(null);

    void fetchDauDayUsers(selection.date, detail?.count)
      .then((users) => {
        if (!cancelled) setActiveUsers(users);
      })
      .catch(() => {
        if (!cancelled) {
          setActiveUsers([]);
          setUsersError("Không tải được danh sách người dùng.");
        }
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selection?.date, detail?.count]);

  const title = selection ? `Ngày ${selection.label}` : "Chi tiết DAU";
  const usersIncomplete = detail != null && detail.count > 0 && activeUsers.length < detail.count;

  const left = detail ? (
    <>
      <MetricHeroCard
        label="DAU"
        value={
          <>
            {fmt.format(detail.count)}{" "}
            <span className="text-base font-medium text-muted-foreground">người</span>
          </>
        }
        sub={detail.dateLabel}
        badge={detail.isPeak ? (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
            <Star className="size-3 mr-1 fill-amber-500 text-amber-500" />
            Cao nhất kỳ
          </Badge>
        ) : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricComparisonCard
          label="So với hôm trước"
          value={detail.previousDayCount == null ? "—" : `${fmt.format(detail.previousDayCount)} người`}
          deltaPct={detail.previousDayPct}
        />
        <MetricComparisonCard
          label="So với TB kỳ"
          value={`${detail.average.toFixed(1)} người`}
          deltaPct={detail.averagePct}
        />
      </div>

      <InsightCard title="Nhận xét">{detail.commentary}</InsightCard>
    </>
  ) : (
    <p className="text-sm text-muted-foreground text-center py-8">Không có dữ liệu cho ngày này.</p>
  );

  const sidebar = (
    <AdminDetailSidebar
      title="Người dùng hoạt động"
      subtitle={
        usersLoading
          ? "Đang tải…"
          : activeUsers.length > 0
            ? `${fmt.format(activeUsers.length)}${usersIncomplete && detail ? ` / ${fmt.format(detail.count)}` : ""} người`
            : "Chưa có danh sách"
      }
    >
      {usersLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Đang tải danh sách…
        </div>
      ) : usersError ? (
        <p className="text-sm text-destructive text-center py-12 px-4">{usersError}</p>
      ) : detail?.count === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12 px-4">
          Không có người dùng hoạt động trong ngày này.
        </p>
      ) : activeUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12 px-4">
          Không tìm thấy người dùng trong nhật ký hoạt động.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {activeUsers.map((user) => (
            <DauDayUserRow key={user.userId} user={user} onNavigate={() => onOpenChange(false)} />
          ))}
        </ul>
      )}
      {usersIncomplete && !usersLoading && !usersError && (
        <p className="text-[11px] text-muted-foreground px-4 py-3 border-t">
          Danh sách có thể chưa đầy đủ — dữ liệu lấy từ nhật ký hoạt động theo trang.
        </p>
      )}
    </AdminDetailSidebar>
  );

  return (
    <AdminDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Chi tiết người dùng hoạt động trong ngày đã chọn."
      loading={false}
      left={left}
      sidebar={sidebar}
    />
  );
}

function getChangePct(current: number | null, baseline: number | null): number | null {
  if (current == null || baseline == null || baseline === 0) return null;
  return ((current - baseline) / baseline) * 100;
}

function buildCommentary(
  count: number,
  previousDay: number | null,
  average: number,
  isPeak: boolean,
): string {
  const parts: string[] = [];

  if (isPeak) parts.push("Đây là ngày có DAU cao nhất trong kỳ đang xem.");

  if (average > 0) {
    const vsAvg = ((count - average) / average) * 100;
    if (vsAvg >= 20) parts.push(`Cao hơn trung bình kỳ ${vsAvg.toFixed(1)}%.`);
    else if (vsAvg <= -20) parts.push(`Thấp hơn trung bình kỳ ${Math.abs(vsAvg).toFixed(1)}%.`);
    else parts.push("Gần với mức trung bình của kỳ.");
  }

  if (previousDay != null && previousDay > 0) {
    const vsPrev = ((count - previousDay) / previousDay) * 100;
    if (Math.abs(vsPrev) >= 30) {
      parts.push(vsPrev > 0
        ? `Tăng mạnh ${vsPrev.toFixed(1)}% so với hôm trước.`
        : `Giảm mạnh ${Math.abs(vsPrev).toFixed(1)}% so với hôm trước.`);
    }
  }

  return parts.length > 0 ? parts.join(" ") : "Chưa có đủ dữ liệu để đánh giá xu hướng.";
}

function DauDayUserRow({ user, onNavigate }: { user: DauDayUser; onNavigate: () => void }) {
  const display = user.fullName ?? user.username ?? "Người dùng";
  const initial = display.charAt(0).toUpperCase();
  const href = resolveCustomerShowHref(user.accountId);
  const content = (
    <>
      <Avatar className="size-8 shrink-0 ring-2 ring-background">
        <AvatarImage src={user.avatarUrl ?? undefined} />
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{display}</p>
        {user.username && <p className="text-xs text-muted-foreground truncate">@{user.username}</p>}
      </div>
    </>
  );

  if (!href) {
    return <li className="flex items-center gap-3 px-4 py-3">{content}</li>;
  }

  return (
    <li>
      <Link
        to={href}
        onClick={onNavigate}
        className="flex items-center gap-3 px-4 py-3 hover:bg-background/80 transition-colors cursor-pointer"
      >
        {content}
      </Link>
    </li>
  );
}
