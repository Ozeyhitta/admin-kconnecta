import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { describeStatsRange, type StatsDateRange } from "@/lib/statsDateRange";
import {
  AdminDetailModal,
  AdminDetailSidebar,
  InsightCard,
  MetricComparisonCard,
  MetricHeroCard,
  SectionCard,
} from "@/components/admin/admin-detail-modal";
import { BREAKDOWN_COLORS, INTERACTION_TYPE_TO_ACTION } from "@/pages/stats/types";
import { ActivityLogSidebarList } from "@/pages/stats/components/ActivityLogListItem";
import { fetchHourActivityDetail, type HourActivityDetail } from "../lib/fetchHourActivityDetail";

const fmt = new Intl.NumberFormat("vi-VN");

export type HourChartSelection = {
  hour: number;
  count: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: StatsDateRange;
  selectedDate: string;
  selection: HourChartSelection | null;
  hourCounts: number[] | null;
  peakHour: number;
  rangeTotal: number;
  onTypeDrillDown?: (type: string) => void;
  returnTo?: string;
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

export function ActivityHourDetailDialog({
  open,
  onOpenChange,
  dateRange,
  selectedDate,
  selection,
  hourCounts,
  peakHour,
  rangeTotal,
  onTypeDrillDown,
  returnTo,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<HourActivityDetail | null>(null);

  const handleTypeClick = React.useCallback((type: string) => {
    const actionType = INTERACTION_TYPE_TO_ACTION[type];
    if (!actionType || !onTypeDrillDown) return;
    onOpenChange(false);
    onTypeDrillDown(type);
  }, [onOpenChange, onTypeDrillDown]);

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

    void fetchHourActivityDetail(selectedDate, selection.hour)
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
  }, [open, selectedDate, selection]);

  const selectedDayLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const title = selection ? formatHourRange(selection.hour) : "Chi tiết theo giờ";
  const session = selection ? hourSession(selection.hour) : "";

  const left = chartContext ? (
    <>
      <MetricHeroCard
        label="Tổng hoạt động"
        value={fmt.format(data?.totalCount ?? chartContext.count)}
        sub={<span>{session} · {selectedDayLabel}</span>}
        badge={chartContext.isPeak ? (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
            Giờ cao điểm trong ngày
          </Badge>
        ) : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricComparisonCard
          label="So với giờ trước"
          value={chartContext.previousHourCount == null ? "—" : fmt.format(chartContext.previousHourCount)}
          deltaPct={chartContext.previousHourPct}
        />
        <MetricComparisonCard
          label="So với TB/giờ"
          value={chartContext.averagePerHour.toFixed(1)}
          deltaPct={chartContext.averagePct}
        />
        <MetricComparisonCard
          label="Tỷ trọng trong ngày"
          value={`${chartContext.shareOfRange.toFixed(1)}%`}
          deltaLabel={`${fmt.format(chartContext.count)} / ${fmt.format(rangeTotal)}`}
        />
      </div>

      <InsightCard title="Nhận xét tự động">{chartContext.commentary}</InsightCard>

      <SectionCard title="Phân bổ theo loại">
        {(data?.breakdown ?? []).every((item) => item.count === 0) ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Không có hoạt động trong khung giờ này.
          </p>
        ) : (
          <>
            <p className="text-[10px] text-muted-foreground text-right mb-2">Nhấn loại để xem chi tiết</p>
            {(data?.breakdown ?? []).map((item) => {
              const clickable = item.count > 0 && Boolean(INTERACTION_TYPE_TO_ACTION[item.type]);
              return (
                <div
                  key={item.type}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  className={[
                    "space-y-1.5 rounded-md -mx-1 px-1.5 py-1 transition-colors",
                    clickable ? "cursor-pointer hover:bg-muted/60" : "",
                  ].join(" ").trim()}
                  onClick={clickable ? () => handleTypeClick(item.type) : undefined}
                  onKeyDown={clickable ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleTypeClick(item.type);
                    }
                  } : undefined}
                >
                  <div className="flex justify-between text-sm gap-3">
                    <span className="font-medium">{item.type}</span>
                    <span className="tabular-nums text-muted-foreground shrink-0">
                      {fmt.format(item.count)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: BREAKDOWN_COLORS[item.type] ?? "#94a3b8",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </SectionCard>
    </>
  ) : null;

  const sidebar = (
    <AdminDetailSidebar
      title="Hoạt động gần đây"
      subtitle={data?.recentLogs.length
        ? `${fmt.format(data.recentLogs.length)} mục trong khung giờ`
        : "Chưa có log"}
      viewAllHref="/activity-logs"
      viewAllState={returnTo ? { returnTo } : undefined}
      onViewAll={() => onOpenChange(false)}
    >
      <ActivityLogSidebarList
        logs={data?.recentLogs ?? []}
        onNavigate={() => onOpenChange(false)}
        linkState={returnTo ? { returnTo } : undefined}
        emptyMessage={
          chartContext && chartContext.count > 0
            ? "Chưa tải được danh sách hoạt động chi tiết."
            : "Không có hoạt động trong khung giờ này."
        }
        incompleteNote={
          data?.listIncomplete
            ? `Hiển thị ${fmt.format(data.recentLogs.length)} hoạt động gần nhất trong tổng ${fmt.format(data.totalCount)}.`
            : undefined
        }
      />
    </AdminDetailSidebar>
  );

  return (
    <AdminDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`${describeStatsRange(dateRange)} · Đăng bài, bình luận, cảm xúc, chia sẻ, kết bạn`}
      loading={loading}
      error={error}
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
  previousHour: number | null,
  averagePerHour: number,
  shareOfRange: number,
  isPeak: boolean,
) {
  if (count === 0) return "Không ghi nhận hoạt động trong khung giờ này.";
  const peakSentence = isPeak ? "Đây là giờ cao điểm trong ngày đã chọn." : "";
  const shareSentence = shareOfRange > 0
    ? `Chiếm ${shareOfRange.toFixed(1)}% tổng hoạt động trong ngày.`
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
