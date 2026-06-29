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
import { TOPIC_SOURCE_META, formatTopicLabel, trendLabelClass } from "../constants";
import type { TopicSource, TopicTrend } from "../types";
import { exportTopicsCsv, fmt } from "../utils";

type SortKey = "score" | "growth" | "posts" | "reports";
type SourceFilter = "all" | TopicSource;

type TopicTrendTableProps = {
  topics: TopicTrend[];
  loading: boolean;
  onTopicSelect?: (topic: TopicTrend) => void;
};

const SourceBadge = ({ source }: { source: TopicSource }) => {
  const meta = TOPIC_SOURCE_META[source] ?? TOPIC_SOURCE_META.UNCATEGORIZED;
  return (
    <Badge variant="outline" className={`text-[10px] ${meta.badgeClass}`}>
      {meta.label}
    </Badge>
  );
};

export function TopicTrendTable({ topics, loading, onTopicSelect }: TopicTrendTableProps) {
  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("score");
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>("all");
  const [hideUncategorized, setHideUncategorized] = React.useState(true);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = topics;
    if (hideUncategorized) {
      list = list.filter((t) => t.source !== "UNCATEGORIZED" && t.topic !== "khác");
    }
    if (sourceFilter !== "all") {
      list = list.filter((t) => t.source === sourceFilter);
    }
    if (q) list = list.filter((t) => t.topic.toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "growth":
          return b.growthRate - a.growthRate;
        case "posts":
          return b.postCount - a.postCount;
        case "reports":
          return b.reportCount - a.reportCount;
        default:
          return b.topicScore - a.topicScore;
      }
    });
  }, [topics, query, sortKey, sourceFilter, hideUncategorized]);

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
            placeholder="Lọc chủ đề..."
            className="pl-8 h-8"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">Mọi nguồn</option>
          <option value="HASHTAG">Hashtag</option>
          <option value="UNCATEGORIZED">Chưa gắn #</option>
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="score">Sắp xếp: Điểm</option>
          <option value="growth">Sắp xếp: Tăng trưởng</option>
          <option value="posts">Sắp xếp: Số bài</option>
          <option value="reports">Sắp xếp: Báo cáo</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={hideUncategorized}
            onChange={(e) => setHideUncategorized(e.target.checked)}
            className="rounded border-input"
          />
          Ẩn #khác
        </label>
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
        <p className="text-sm text-muted-foreground text-center py-10">Không có chủ đề phù hợp</p>
      ) : (
        <div className="max-h-[440px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chủ đề</TableHead>
                <TableHead>Nguồn</TableHead>
                <TableHead className="text-right">Bài</TableHead>
                <TableHead className="text-right">Điểm</TableHead>
                <TableHead className="text-right hidden sm:table-cell">BC</TableHead>
                <TableHead className="text-right">Tăng trưởng</TableHead>
                <TableHead className="text-right">Phân loại</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow
                  key={`${t.source}-${t.topic}`}
                  className={onTopicSelect ? "cursor-pointer hover:bg-muted/50" : undefined}
                  onClick={() => onTopicSelect?.(t)}
                >
                  <TableCell className="font-medium">{formatTopicLabel(t.topic, t.source)}</TableCell>
                  <TableCell>
                    <SourceBadge source={t.source} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt.format(t.postCount)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {fmt.format(t.topicScore)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums hidden sm:table-cell ${
                      t.reportCount > 0 ? "text-red-500 font-medium" : ""
                    }`}
                  >
                    {fmt.format(t.reportCount)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-medium ${
                      t.growthRate >= 0 ? "text-success" : "text-red-500"
                    }`}
                  >
                    <span className="inline-flex items-center gap-0.5 justify-end">
                      {t.growthRate >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {t.growthRate >= 0 ? "+" : ""}
                      {t.growthRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={trendLabelClass(t.trendLabel)}>
                      {t.trendLabel}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
