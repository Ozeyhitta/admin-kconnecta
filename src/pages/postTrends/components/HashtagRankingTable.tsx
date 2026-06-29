import * as React from "react";
import { Download, Search, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTopicLabel, trendLabelClass } from "../constants";
import { FALLBACK_TOPIC, sortHashtagRankings } from "../lib/postTrendsAnalytics";
import type { TopicTrend } from "../types";
import { exportTopicsCsv, fmt } from "../utils";

type SortKey = "score" | "growth" | "posts" | "reports" | "interactions";

type HashtagRankingTableProps = {
  topics: TopicTrend[];
  loading: boolean;
  onTopicSelect?: (topic: TopicTrend) => void;
};

export function HashtagRankingTable({ topics, loading, onTopicSelect }: HashtagRankingTableProps) {
  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("score");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = sortHashtagRankings(topics, sortKey === "growth" ? "score" : sortKey);
    if (q) list = list.filter((t) => t.topic.toLowerCase().includes(q));
    if (sortKey === "growth") {
      list = [...list].sort((a, b) => {
        const aFallback = a.topic === FALLBACK_TOPIC ? 1 : 0;
        const bFallback = b.topic === FALLBACK_TOPIC ? 1 : 0;
        if (aFallback !== bFallback) return aFallback - bFallback;
        return b.growthRate - a.growthRate;
      });
    }
    return list;
  }, [topics, query, sortKey]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[160px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Lọc hashtag..."
            className="h-8 pl-8"
          />
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="score">Điểm xu hướng</option>
          <option value="posts">Số bài</option>
          <option value="interactions">Tương tác</option>
          <option value="reports">Báo cáo</option>
          <option value="growth">Thay đổi kỳ trước</option>
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={filtered.length === 0}
          onClick={() => exportTopicsCsv(filtered)}
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Không có hashtag phù hợp</p>
      ) : (
        <div className="max-h-[min(60vh,520px)] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Hashtag</TableHead>
                <TableHead className="text-right">Bài</TableHead>
                <TableHead className="text-right hidden md:table-cell">Like</TableHead>
                <TableHead className="text-right">BL</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Chia sẻ</TableHead>
                <TableHead className="text-right">BC</TableHead>
                <TableHead className="text-right">Điểm</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Kỳ trước</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t, index) => {
                const isFallback = t.topic === FALLBACK_TOPIC || t.source === "UNCATEGORIZED";
                const displayRank = isFallback
                  ? "—"
                  : String(
                      filtered
                        .slice(0, index + 1)
                        .filter((x) => x.topic !== FALLBACK_TOPIC && x.source !== "UNCATEGORIZED").length,
                    );
                return (
                  <TableRow
                    key={`${t.source}-${t.topic}`}
                    className={`${onTopicSelect ? "cursor-pointer hover:bg-muted/50" : ""} ${isFallback ? "bg-muted/20" : ""}`}
                    onClick={() => onTopicSelect?.(t)}
                  >
                    <TableCell className="text-muted-foreground tabular-nums">{displayRank}</TableCell>
                    <TableCell className="font-medium">
                      {isFallback ? "Chưa gắn hashtag" : formatTopicLabel(t.topic, t.source)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmt.format(t.postCount)}</TableCell>
                    <TableCell className="text-right tabular-nums hidden md:table-cell">
                      {fmt.format(t.likeCount ?? 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmt.format(t.commentCount)}</TableCell>
                    <TableCell className="text-right tabular-nums hidden lg:table-cell">
                      {fmt.format(t.shareCount ?? 0)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${t.reportCount > 0 ? "text-red-600 font-medium" : ""}`}
                    >
                      {fmt.format(t.reportCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {fmt.format(t.topicScore)}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <span
                        className={`inline-flex items-center gap-0.5 tabular-nums font-medium ${
                          t.growthRate >= 0 ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {t.growthRate >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {t.growthRate >= 0 ? "+" : ""}
                        {t.growthRate.toFixed(1)}%
                      </span>
                      <Badge variant="outline" className={`ml-1 text-[10px] ${trendLabelClass(t.trendLabel)}`}>
                        {t.trendLabel}
                      </Badge>
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
