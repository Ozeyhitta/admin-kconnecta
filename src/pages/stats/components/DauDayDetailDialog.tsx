import * as React from "react";
import { Link } from "react-router";
import { Loader2, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 pr-12 shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Chi tiết người dùng hoạt động trong ngày đã chọn.</DialogDescription>
        </DialogHeader>

        {detail ? (
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">DAU</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {fmt.format(detail.count)} <span className="text-base font-medium text-muted-foreground">người</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{detail.dateLabel}</p>
                </div>
                {detail.isPeak && (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 shrink-0">
                    <Star className="size-3 mr-1 fill-amber-500 text-amber-500" />
                    Cao nhất kỳ
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <ComparisonStat
                label="So với hôm trước"
                value={detail.previousDayCount}
                deltaPct={detail.previousDayPct}
                unit="người"
              />
              <ComparisonStat
                label="So với TB kỳ"
                value={detail.average}
                deltaPct={detail.averagePct}
                unit="người"
                formatValue={(v) => v.toFixed(1)}
              />
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Nhận xét
              </p>
              <p className="text-sm leading-relaxed">{detail.commentary}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Người dùng hoạt động
                </p>
                {!usersLoading && activeUsers.length > 0 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {fmt.format(activeUsers.length)}
                    {usersIncomplete ? ` / ${fmt.format(detail.count)}` : ""}
                  </span>
                )}
              </div>
              {usersLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Đang tải danh sách…
                </div>
              ) : usersError ? (
                <p className="text-sm text-destructive text-center py-6">{usersError}</p>
              ) : detail.count === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Không có người dùng hoạt động trong ngày này.
                </p>
              ) : activeUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Không tìm thấy người dùng trong nhật ký hoạt động.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border max-h-56 overflow-y-auto">
                  {activeUsers.map((user) => (
                    <DauDayUserRow
                      key={user.userId}
                      user={user}
                      onNavigate={() => onOpenChange(false)}
                    />
                  ))}
                </ul>
              )}
              {usersIncomplete && !usersLoading && !usersError && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Danh sách có thể chưa đầy đủ — dữ liệu lấy từ nhật ký hoạt động theo trang.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8 px-6">Không có dữ liệu cho ngày này.</p>
        )}
      </DialogContent>
    </Dialog>
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

  if (isPeak) {
    parts.push("Đây là ngày có DAU cao nhất trong kỳ đang xem.");
  }

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

function DauDayUserRow({
  user,
  onNavigate,
}: {
  user: DauDayUser;
  onNavigate: () => void;
}) {
  const display = user.fullName ?? user.username ?? "Người dùng";
  const initial = display.charAt(0).toUpperCase();
  const href = resolveCustomerShowHref(user.accountId);
  const content = (
    <>
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={user.avatarUrl ?? undefined} />
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{display}</p>
        {user.username && (
          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
        )}
      </div>
    </>
  );

  if (!href) {
    return <li className="flex items-center gap-3 px-3 py-2.5">{content}</li>;
  }

  return (
    <li>
      <Link
        to={href}
        onClick={onNavigate}
        className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        {content}
      </Link>
    </li>
  );
}

function ComparisonStat({
  label,
  value,
  deltaPct,
  unit,
  formatValue,
}: {
  label: string;
  value: number | null;
  deltaPct: number | null;
  unit?: string;
  formatValue?: (v: number) => string;
}) {
  const display = value == null
    ? "—"
    : `${formatValue ? formatValue(value) : fmt.format(value)}${unit ? ` ${unit}` : ""}`;

  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{display}</p>
      <p className="text-[11px] text-muted-foreground">
        {deltaPct == null ? "Không đủ dữ liệu" : `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
      </p>
    </div>
  );
}
