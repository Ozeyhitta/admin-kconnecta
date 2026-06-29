import * as React from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import {
  AdminDetailModal,
  AdminDetailSidebar,
  MetricComparisonCard,
  MetricHeroCard,
  SectionIntro,
} from "@/components/admin/admin-detail-modal";
import { apiClient } from "@/services/axiosInstance";
import { formatTopicLabel, TOPIC_SOURCE_META, trendLabelClass } from "../constants";
import type { TopicChartSelection, TopicPostsResponse, TrendRange } from "../types";
import { adminPostShowPath, fmt, formatDay, formatFullDay } from "../utils";

type TopicPostsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  range: TrendRange;
  selection: TopicChartSelection | null;
};

export function TopicPostsDialog({ open, onOpenChange, range, selection }: TopicPostsDialogProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<TopicPostsResponse | null>(null);

  React.useEffect(() => {
    if (!open || !selection?.topic) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void apiClient
      .get<TopicPostsResponse>("/api/v1/admin/analytics/post-trends/topics/posts", {
        params: {
          topic: selection.topic,
          range,
          ...(selection.source ? { source: selection.source } : {}),
          ...(selection.date ? { date: selection.date } : {}),
        },
      })
      .then((r) => {
        if (!cancelled) setData(r.data);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError("Không tải được danh sách bài viết.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, range, selection?.topic, selection?.source, selection?.date]);

  const titleLabel = selection
    ? formatTopicLabel(selection.topic, selection.source)
    : "Chủ đề";

  const stats = React.useMemo(() => {
    if (!data?.posts.length) return null;
    return data.posts.reduce(
      (acc, post) => ({
        likes: acc.likes + post.likeCount,
        comments: acc.comments + post.commentCount,
        shares: acc.shares + post.shareCount,
        reports: acc.reports + post.reportCount,
        score: acc.score + post.trendScore,
      }),
      { likes: 0, comments: 0, shares: 0, reports: 0, score: 0 },
    );
  }, [data?.posts]);

  const openPost = (postId: string) => {
    onOpenChange(false);
    navigate(adminPostShowPath(postId));
  };

  const description = selection?.date
    ? data
      ? `${fmt.format(data.postCount)} bài ngày ${formatFullDay(selection.date)}`
      : `Đang tải bài viết ngày ${formatFullDay(selection.date)}…`
    : data
      ? `${fmt.format(data.postCount)} bài trong kỳ ${range === "30d" ? "30 ngày" : "7 ngày"}`
      : "Đang tải danh sách bài viết…";

  const left = data && stats ? (
    <>
      <MetricHeroCard
        label="Tổng bài viết"
        value={fmt.format(data.postCount)}
        sub={description}
        badge={
          selection?.source ? (
            <Badge variant="outline" className={TOPIC_SOURCE_META[selection.source]?.badgeClass}>
              {TOPIC_SOURCE_META[selection.source]?.label}
            </Badge>
          ) : undefined
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricComparisonCard label="Tổng like" value={fmt.format(stats.likes)} />
        <MetricComparisonCard label="Tổng bình luận" value={fmt.format(stats.comments)} />
        <MetricComparisonCard label="Tổng chia sẻ" value={fmt.format(stats.shares)} />
        <MetricComparisonCard label="Tổng báo cáo" value={fmt.format(stats.reports)} />
      </div>
      <SectionIntro
        title="Danh sách bài viết theo chủ đề"
        description="Bấm từng bài ở cột bên phải để xem chi tiết bài viết."
      />
    </>
  ) : null;

  const sidebar = (
    <AdminDetailSidebar
      title="Bài viết"
      subtitle={data ? `${fmt.format(data.posts.length)} / ${fmt.format(data.postCount)} hiển thị` : undefined}
      footer={
        data && data.postCount > data.posts.length
          ? `Giới hạn hiển thị 100 bài trong tổng ${fmt.format(data.postCount)}.`
          : undefined
      }
    >
      {!data || data.posts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center px-4">
          {loading ? "Đang tải…" : "Không có bài viết cho chủ đề này."}
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {data.posts.map((p) => (
            <li key={p.postId}>
              <button
                type="button"
                onClick={() => openPost(p.postId)}
                className="w-full px-4 py-3 text-left hover:bg-background/80 transition-colors cursor-pointer"
              >
                <p className="line-clamp-2 text-sm font-medium">
                  {p.content || <span className="italic font-normal text-muted-foreground">(không có nội dung)</span>}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.authorName ?? p.authorUsername ?? "—"}
                  {p.createdAt ? ` · ${formatDay(p.createdAt)}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold tabular-nums text-primary">{fmt.format(p.trendScore)} điểm</span>
                  <Badge variant="outline" className={`text-[10px] ${trendLabelClass(p.trendLabel)}`}>
                    {p.trendLabel}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    👍 {fmt.format(p.likeCount)} · 💬 {fmt.format(p.commentCount)}
                  </span>
                </div>
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
      title={`Bài viết theo chủ đề ${titleLabel}`}
      loading={loading}
      error={error}
      left={left ?? <p className="text-sm text-muted-foreground py-8 text-center">Không có dữ liệu.</p>}
      sidebar={sidebar}
    />
  );
}
