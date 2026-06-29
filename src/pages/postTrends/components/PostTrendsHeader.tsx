import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TREND_RANGE_OPTIONS } from "../constants";
import type { TrendRange } from "../types";
import { formatDateTime } from "../utils";
import { rangeLabel } from "../lib/postTrendsAnalytics";
import { ScoreFormulaHelp } from "./ScoreFormulaHelp";

type PostTrendsHeaderProps = {
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
  generatedAt?: string;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
};

export function PostTrendsHeader({
  range,
  onRangeChange,
  generatedAt,
  loading,
  refreshing,
  error,
  onRefresh,
}: PostTrendsHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Phân tích xu hướng bài viết</h1>
          <p className="text-sm text-muted-foreground">
            Dữ liệu {rangeLabel(range)}
            {generatedAt ? ` • Cập nhật lúc ${formatDateTime(generatedAt)}` : loading ? " • Đang tải…" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ScoreFormulaHelp />
          <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Khoảng thời gian">
            {TREND_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onRangeChange(opt.value)}
                aria-pressed={range === opt.value}
                className={`cursor-pointer rounded-md px-3 py-1 text-sm font-medium transition-colors min-h-8 ${
                  range === opt.value
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading || refreshing}
            className="gap-1.5 min-h-8"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
            Thử lại
          </Button>
        </div>
      )}
    </div>
  );
}
