import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminDetailModal,
  AdminDetailSidebar,
  InsightCard,
  MetricHeroCard,
} from "@/components/admin/admin-detail-modal";
import type { AttentionGroup } from "../lib/postTrendsAnalytics";
import { adminPostShowPath, fmt, formatDay } from "../utils";

type AttentionPostsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: AttentionGroup | null;
};

export function AttentionPostsSheet({ open, onOpenChange, group }: AttentionPostsSheetProps) {
  const postCount = group?.posts.length ?? 0;
  const totalReports = group?.posts.reduce((sum, p) => sum + p.reportCount, 0) ?? 0;

  const left = group ? (
    <>
      <MetricHeroCard
        label={group.label}
        value={fmt.format(group.count)}
        sub={group.description}
      />
      {group.id === "reported" && postCount > 0 && (
        <InsightCard title="Tổng báo cáo" tone="muted">
          {fmt.format(totalReports)} báo cáo trên {fmt.format(postCount)} bài hiển thị.
        </InsightCard>
      )}
    </>
  ) : null;

  const sidebar = (
    <AdminDetailSidebar title="Danh sách bài viết" subtitle={postCount > 0 ? `${fmt.format(postCount)} bài` : undefined}>
      {!group || postCount === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center px-4">
          Không có bài trong nhóm này. Dùng bảng hashtag hoặc cảnh báo hệ thống để xem thêm.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {group.posts.map((post) => (
            <li key={post.postId} className="px-4 py-3 space-y-2">
              <p className="text-sm line-clamp-3">{post.content || "(không có nội dung)"}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{post.authorName ?? post.authorUsername ?? "—"}</span>
                <span>{post.createdAt ? formatDay(post.createdAt) : "—"}</span>
                <span>Điểm: {fmt.format(post.trendScore)}</span>
                <span className={post.reportCount > 0 ? "text-red-600 font-medium" : ""}>
                  BC: {fmt.format(post.reportCount)}
                </span>
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1" asChild>
                <Link to={adminPostShowPath(post.postId)} onClick={() => onOpenChange(false)}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Xem bài viết
                </Link>
              </Button>
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
      title={group?.label ?? "Bài cần chú ý"}
      left={left ?? <></>}
      sidebar={sidebar}
    />
  );
}
