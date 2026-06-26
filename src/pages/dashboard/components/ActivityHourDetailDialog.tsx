import * as React from "react";
import { Link } from "react-router";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { describeStatsRange, type StatsDateRange } from "@/lib/statsDateRange";
import { BREAKDOWN_COLORS } from "@/pages/stats/types";
import {
  isPostActivityLink,
  resolveActivityLogCustomerHref,
  resolveActivityLogHref,
} from "@/pages/stats/lib/activityLogLinks";
import type { InteractionActivityLogItem } from "@/pages/stats/types";
import type { ActivityLogItem } from "./activityLogs/types";
import {
  fetchHourActivityDetail,
  type HourActivityDetail,
} from "../lib/fetchHourActivityDetail";

const fmt = new Intl.NumberFormat("vi-VN");
const timeFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

export type HourChartSelection = {
  hour: number;
  count: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: StatsDateRange;
  selection: HourChartSelection | null;
  hourCounts: number[] | null;
  peakHour: number;
  rangeTotal: number;
};

function hourSession(h: number): string {
  if (h < 6) return "Đêm / Rạng sáng";
  if (h < 12) return "Buổi sáng";
  if (h < 14) return "Buổi trưa";
  if (h < 18) return "Buổi chiều";
  return "Buổi tối";
}

function formatHourRange(hour: number) {
  return `${String(hour).padStart(2, "0")}:00 – ${String(hour + 1).padStart(2, "0")}:00`;
}

function toInteractionLog(item: ActivityLogItem): InteractionActivityLogItem {
  return {
    id: item.id,
    userId: item.userId,
    username: item.username,
    fullName: item.fullName,
    avatarUrl: item.avatarUrl,
    actionType: item.actionType,
    actionLabel: item.actionLabel,
    description: item.description,
    createdAt: item.createdAt,
    targetType: item.targetType,
    targetId: item.targetId,
    metadata: item.metadata,
  };
}

export function ActivityHourDetailDialog({
  open,
  onOpenChange,
  dateRange,
  selection,
  hourCounts,
  peakHour,
  rangeTotal,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<HourActivityDetail | null>(null);

  const chartContext = React.useMemo(() => {
    if (!selection || !hourCounts?.length) return null;

    const count = selection.count;
    const previousHourCount = selection.hour > 0 ? hourCounts[selection.hour - 1] : null;
    const averagePerHour = rangeTotal > 0 ? rangeTotal / 24 : 0;
    const shareOfRange = rangeTotal > 0 ? (count / rangeTotal) * 100 : 0;
    const isPeak = count > 0 && selection.hour === peakHour;

    return {
      count,
      previousHourCount,
      averagePerHour,
      shareOfRange,
      isPeak,
      previousHourPct: getChangePct(count, previousHourCount),
      averagePct: getChangePct(count, averagePerHour),
      commentary: buildCommentary(count, previousHourCount, averagePerHour, shareOfRange, isPeak),
    };
  }, [hourCounts, peakHour, rangeTotal, selection]);

  React.useEffect(() => {
    if (!open || !selection) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchHourActivityDetail(dateRange, selection.hour, selection.count > 0 ? selection.count : undefined)
      .then((detail) => {
        if (!cancelled) setData(detail);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError("Không tải được chi tiết hoạt động.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, dateRange, selection]);

  const title = selection ? formatHourRange(selection.hour) : "Chi tiết theo giờ";
  const session = selection ? hourSession(selection.hour) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 pr-12 shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {session} · {describeStatsRange(dateRange)} · Đăng bài, bình luận, cảm xúc, chia sẻ, kết bạn
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Đang tải chi tiết…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-12">{error}</p>
          ) : selection && chartContext ? (
            <>
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground">Tổng hoạt động</p>
                <p className="text-2xl font-bold tabular-nums">
                  {fmt.format(data?.totalCount ?? chartContext.count)}
                </p>
                {chartContext.isPeak && (
                  <Badge className="mt-2 bg-amber-100 text-amber-800 hover:bg-amber-100">
                    Giờ cao điểm trong kỳ
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <ComparisonStat
                  label="So với giờ trước"
                  value={chartContext.previousHourCount}
                  deltaPct={chartContext.previousHourPct}
                />
                <ComparisonStat
                  label="So với TB/giờ"
                  value={chartContext.averagePerHour}
                  deltaPct={chartContext.averagePct}
                />
                <ComparisonStat
                  label="Tỷ trọng trong kỳ"
                  value={chartContext.shareOfRange}
                  deltaPct={null}
                  suffix="%"
                />
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Nhận xét tự động
                </p>
                <p className="text-sm leading-relaxed">{chartContext.commentary}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Phân bổ theo loại
                </p>
                {(data?.breakdown ?? []).every((item) => item.count === 0) ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Không có hoạt động trong khung giờ này.
                  </p>
                ) : (
                  (data?.breakdown ?? []).map((item) => (
                    <div key={item.type} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.type}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {fmt.format(item.count)} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: BREAKDOWN_COLORS[item.type] ?? "#94a3b8",
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hoạt động gần đây
                  </p>
                  <Link
                    to="/activity-logs"
                    className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    Xem tất cả
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
                {!data || data.recentLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    {chartContext.count > 0
                      ? "Chưa tải được danh sách hoạt động chi tiết."
                      : "Không có hoạt động trong khung giờ này."}
                  </p>
                ) : (
                  <>
                    {data.listIncomplete && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Hiển thị {fmt.format(data.recentLogs.length)} hoạt động gần nhất
                        {data.totalCount > data.recentLogs.length
                          ? ` trong tổng ${fmt.format(data.totalCount)}.`
                          : "."}
                      </p>
                    )}
                    <ul className="divide-y rounded-lg border">
                      {data.recentLogs.map((log) => (
                        <ActivityLogRow key={log.id} log={log} onNavigate={() => onOpenChange(false)} />
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActivityLogRow({
  log,
  onNavigate,
}: {
  log: ActivityLogItem;
  onNavigate: () => void;
}) {
  const interactionLog = React.useMemo(() => toInteractionLog(log), [log]);
  const [href, setHref] = React.useState<string | null>(() => resolveActivityLogHref(interactionLog));

  React.useEffect(() => {
    let cancelled = false;
    const syncHref = resolveActivityLogHref(interactionLog);
    if (syncHref) {
      setHref(syncHref);
      return;
    }

    void resolveActivityLogCustomerHref(interactionLog).then((resolved) => {
      if (!cancelled) setHref(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [interactionLog]);

  const showPostIcon = isPostActivityLink(href);
  const content = (
    <>
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={log.avatarUrl ?? undefined} />
        <AvatarFallback className="text-xs">
          {(log.fullName ?? log.username ?? "?").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium truncate">
            {log.fullName ?? log.username ?? "Người dùng"}
          </span>
          {(log.actionLabel ?? log.actionType) && (
            <Badge variant="secondary" className="text-[10px] font-normal">
              {log.actionLabel ?? log.actionType}
            </Badge>
          )}
        </div>
        {log.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{log.description}</p>
        )}
        {log.createdAt && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {timeFmt.format(new Date(log.createdAt))}
          </p>
        )}
      </div>
      {showPostIcon && (
        <ExternalLink className="size-3.5 shrink-0 mt-1 text-muted-foreground opacity-60" aria-hidden />
      )}
    </>
  );

  if (!href) {
    return <li className="flex items-start gap-3 px-3 py-2.5">{content}</li>;
  }

  return (
    <li>
      <Link
        to={href}
        onClick={onNavigate}
        className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        {content}
      </Link>
    </li>
  );
}

function getChangePct(current: number | null, baseline: number | null): number | null {
  if (current == null || baseline == null || baseline === 0) return null;
  return ((current - baseline) / baseline) * 100;
}

function buildCommentary(
  count: number,
  previousHour: number | null,
  averagePerHour: number,
  shareOfRange: number,
  isPeak: boolean,
) {
  if (count === 0) return "Không ghi nhận hoạt động trong khung giờ này.";
  const peakSentence = isPeak ? "Đây là giờ cao điểm trong kỳ đã chọn." : "";
  const shareSentence = shareOfRange > 0
    ? `Chiếm ${shareOfRange.toFixed(1)}% tổng hoạt động trong kỳ.`
    : "";
  const avgSentence = averagePerHour > 0
    ? count >= averagePerHour
      ? `Cao hơn trung bình ${(((count - averagePerHour) / averagePerHour) * 100).toFixed(0)}% so với TB/giờ.`
      : `Thấp hơn trung bình ${(((averagePerHour - count) / averagePerHour) * 100).toFixed(0)}% so với TB/giờ.`
    : "";
  const prevSentence = previousHour != null && previousHour > 0
    ? count >= previousHour
      ? `Tăng so với giờ trước (${fmt.format(previousHour)} → ${fmt.format(count)}).`
      : `Giảm so với giờ trước (${fmt.format(previousHour)} → ${fmt.format(count)}).`
    : "";
  return [peakSentence, shareSentence, avgSentence, prevSentence].filter(Boolean).join(" ") || "Hoạt động trong khung giờ này.";
}

function ComparisonStat({
  label,
  value,
  deltaPct,
  suffix,
}: {
  label: string;
  value: number | null;
  deltaPct: number | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">
        {value == null ? "—" : `${suffix ? value.toFixed(1) : fmt.format(value)}${suffix ?? ""}`}
      </p>
      {suffix == null && (
        <p className="text-[11px] text-muted-foreground">
          {deltaPct == null ? "Không đủ dữ liệu" : `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
        </p>
      )}
    </div>
  );
}
