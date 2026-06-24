import * as React from "react";
import { Link, useNavigate } from "react-router";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/services/axiosInstance";
import { formatTopicLabel, TOPIC_SOURCE_META, trendLabelClass } from "../constants";
import type { TopicChartSelection, TopicPostsResponse, TopicSource, TrendRange } from "../types";
import { adminPostShowPath, fmt, formatDay } from "../utils";

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
  }, [open, range, selection?.topic, selection?.source]);

  const titleLabel = selection
    ? formatTopicLabel(selection.topic, selection.source)
    : "Chủ đề";

  const openPost = (postId: string) => {
    onOpenChange(false);
    navigate(adminPostShowPath(postId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Bài viết theo chủ đề {titleLabel}
            {selection?.source && (
              <Badge variant="outline" className={TOPIC_SOURCE_META[selection.source]?.badgeClass}>
                {TOPIC_SOURCE_META[selection.source]?.label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {data
              ? `${fmt.format(data.postCount)} bài trong kỳ ${range === "30d" ? "30 ngày" : "7 ngày"}`
              : "Đang tải danh sách bài viết…"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang tải…
            </div>
          )}

          {!loading && error && (
            <p className="py-12 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {!loading && !error && data && data.posts.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Không có bài viết cho chủ đề này.
            </p>
          )}

          {!loading && !error && data && data.posts.length > 0 && (
            <ul className="space-y-2">
              {data.posts.map((p) => (
                <li key={p.postId}>
                  <button
                    type="button"
                    onClick={() => openPost(p.postId)}
                    className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/60 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">
                          {p.content || (
                            <span className="italic font-normal text-muted-foreground">
                              (không có nội dung)
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p.authorName ?? p.authorUsername ?? "—"}
                          {p.createdAt ? ` · ${formatDay(p.createdAt)}` : ""}
                        </p>
                        {p.topicTags && p.topicTags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {p.topicTags.slice(0, 4).map((tag) => (
                              <span
                                key={`${tag.source}-${tag.topic}`}
                                className={`text-[10px] rounded px-1 border ${
                                  TOPIC_SOURCE_META[tag.source as TopicSource]?.badgeClass ?? ""
                                }`}
                              >
                                {formatTopicLabel(tag.topic, tag.source)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums">{fmt.format(p.trendScore)}</p>
                        <p className="text-[10px] text-muted-foreground">điểm</p>
                        <Badge
                          variant="outline"
                          className={`mt-1 text-[10px] ${trendLabelClass(p.trendLabel)}`}
                        >
                          {p.trendLabel}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground tabular-nums">
                      <span>👍 {fmt.format(p.likeCount)}</span>
                      <span>💬 {fmt.format(p.commentCount)}</span>
                      <span>🔁 {fmt.format(p.shareCount)}</span>
                      <span className={p.reportCount > 0 ? "text-red-500 font-medium" : ""}>
                        🚩 {fmt.format(p.reportCount)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && data && data.postCount > data.posts.length && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Hiển thị {fmt.format(data.posts.length)} / {fmt.format(data.postCount)} bài (giới hạn 100).
            </p>
          )}
        </div>

        {data && data.posts.length > 0 && (
          <div className="shrink-0 border-t px-6 py-3 flex justify-end">
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link to={adminPostShowPath(data.posts[0].postId)} onClick={() => onOpenChange(false)}>
                <ExternalLink className="h-3.5 w-3.5" />
                Mở bài đầu tiên
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
