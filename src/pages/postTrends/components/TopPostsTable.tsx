import * as React from "react";
import { Link, useNavigate } from "react-router";
import { Copy, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trendLabelClass, TOPIC_SOURCE_META, formatTopicLabel } from "../constants";
import type { TopPost } from "../types";
import { adminPostShowPath, exportPostsCsv, fmt, formatDay } from "../utils";

const statusLabel = (status: string | null) => {
  switch (status?.toUpperCase()) {
    case "PUBLISHED":
      return { text: "Đã đăng", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "SCHEDULED":
      return { text: "Hẹn giờ", className: "bg-blue-50 text-blue-700 border-blue-200" };
    case "DRAFT":
      return { text: "Nháp", className: "bg-slate-100 text-slate-600 border-slate-200" };
    default:
      return { text: status ?? "—", className: "bg-slate-100 text-slate-600 border-slate-200" };
  }
};

type TopPostsTableProps = {
  posts: TopPost[];
  loading: boolean;
};

export function TopPostsTable({ posts, loading }: TopPostsTableProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState<"all" | "viral" | "risky">("all");

  const filtered = React.useMemo(() => {
    if (filter === "viral") {
      return posts.filter((p) => p.trendLabel === "Tăng mạnh" || p.trendLabel === "Tăng");
    }
    if (filter === "risky") {
      return posts.filter((p) => p.reportCount > 0);
    }
    return posts;
  }, [posts, filter]);

  const copyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(id);
    toast.success("Đã copy Post ID");
  };

  const openPost = (postId: string) => {
    navigate(adminPostShowPath(postId));
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {([
            ["all", "Tất cả"],
            ["viral", "Đang hot"],
            ["risky", "Có báo cáo"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === key
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 ml-auto"
          disabled={filtered.length === 0}
          onClick={() => exportPostsCsv(filtered)}
        >
          <Download className="h-3.5 w-3.5" />
          Xuất CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Chưa có bài viết phù hợp</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[240px]">Bài viết</TableHead>
                <TableHead>Tác giả</TableHead>
                <TableHead className="hidden md:table-cell">Ngày</TableHead>
                <TableHead className="text-right">Điểm</TableHead>
                <TableHead className="text-right">Tăng trưởng</TableHead>
                <TableHead className="text-right">👍</TableHead>
                <TableHead className="text-right">💬</TableHead>
                <TableHead className="text-right hidden lg:table-cell">🔁</TableHead>
                <TableHead className="text-right">🚩</TableHead>
                <TableHead className="text-right">Phân loại</TableHead>
                <TableHead className="w-[88px] text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const st = statusLabel(p.status);
                const showPath = adminPostShowPath(p.postId);
                return (
                  <TableRow
                    key={p.postId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openPost(p.postId)}
                  >
                    <TableCell>
                      <div className="flex items-start gap-1">
                        <div className="min-w-0 flex-1">
                          <Link
                            to={showPath}
                            onClick={(e) => e.stopPropagation()}
                            className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {p.content || (
                              <span className="italic font-normal text-muted-foreground">(không có nội dung)</span>
                            )}
                          </Link>
                          {p.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(p.topicTags?.length ? p.topicTags : p.topics.map((t) => ({ topic: t, source: p.hasHashtag ? "HASHTAG" as const : "UNCATEGORIZED" as const }))).slice(0, 4).map((tag) => {
                            const meta = TOPIC_SOURCE_META[tag.source] ?? TOPIC_SOURCE_META.UNCATEGORIZED;
                            return (
                              <span
                                key={`${tag.source}-${tag.topic}`}
                                className={`text-[10px] rounded px-1 border ${meta.badgeClass}`}
                              >
                                {formatTopicLabel(tag.topic, tag.source)}
                              </span>
                            );
                          })}
                          {!p.hasHashtag && (
                            <span className="text-[10px] text-muted-foreground">không có #</span>
                          )}
                            </div>
                          )}
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] ${st.className}`}>
                              {st.text}
                            </Badge>
                            <button
                              type="button"
                              onClick={(e) => copyId(e, p.postId)}
                              className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                              title="Copy Post ID"
                            >
                              <Copy className="h-3 w-3" />
                              {p.postId.slice(0, 8)}…
                            </button>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {p.authorName ?? p.authorUsername ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">
                      {p.createdAt ? formatDay(p.createdAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {fmt.format(p.trendScore)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        p.growthRate >= 0 ? "text-success" : "text-red-500"
                      }`}
                    >
                      {p.growthRate >= 0 ? "+" : ""}
                      {p.growthRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmt.format(p.likeCount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt.format(p.commentCount)}</TableCell>
                    <TableCell className="text-right tabular-nums hidden lg:table-cell">
                      {fmt.format(p.shareCount)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        p.reportCount > 0 ? "text-red-500 font-semibold" : ""
                      }`}
                    >
                      {fmt.format(p.reportCount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={trendLabelClass(p.trendLabel)}>
                        {p.trendLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" asChild>
                        <Link to={showPath}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Xem
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
