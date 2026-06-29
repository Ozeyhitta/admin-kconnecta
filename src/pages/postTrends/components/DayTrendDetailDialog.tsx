import {
  AdminDetailModal,
  AdminDetailSidebar,
  MetricHeroCard,
  SectionIntro,
} from "@/components/admin/admin-detail-modal";
import { formatTopicLabel } from "../constants";
import type { TopicChartSelection, TopicSource } from "../types";
import { fmt, formatFullDay } from "../utils";

export type DayTrendPoint = {
  topic: string;
  source?: TopicSource;
  score: number;
};

type DayTrendDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  points: DayTrendPoint[];
  onTopicSelect: (selection: TopicChartSelection) => void;
};

export function DayTrendDetailDialog({
  open,
  onOpenChange,
  date,
  points,
  onTopicSelect,
}: DayTrendDetailDialogProps) {
  const totalScore = points.reduce((sum, p) => sum + p.score, 0);

  const left = (
    <>
      <MetricHeroCard
        label="Tổng điểm ngày"
        value={fmt.format(totalScore)}
        sub={date ? formatFullDay(date) : undefined}
      />
      <SectionIntro
        title="Hashtag theo ngày"
        description="Bấm hashtag ở cột bên phải để xem danh sách bài viết trong ngày đó."
      />
    </>
  );

  const sidebar = (
    <AdminDetailSidebar
      title="Hashtag có điểm"
      subtitle={points.length > 0 ? `${fmt.format(points.length)} hashtag` : "Không có dữ liệu"}
    >
      {points.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center px-4">
          Không có tương tác hashtag trong ngày đã chọn.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {points.map((point) => (
            <li key={`${point.source ?? "HASHTAG"}-${point.topic}`}>
              <button
                type="button"
                onClick={() =>
                  onTopicSelect({
                    topic: point.topic,
                    source: point.source ?? "HASHTAG",
                    date: date ?? undefined,
                  })
                }
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-background/80 transition-colors cursor-pointer"
              >
                <span className="font-medium text-sm">{formatTopicLabel(point.topic, point.source)}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                  {fmt.format(point.score)} điểm
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </AdminDetailSidebar>
  );

  return (
    <AdminDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={date ? `Chi tiết ngày ${formatFullDay(date)}` : "Chi tiết theo ngày"}
      left={left}
      sidebar={sidebar}
    />
  );
}
