import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TREND_FORMULA, TREND_RANGE_OPTIONS } from "../constants";
import type { TrendRange } from "../types";
import { formatDateTime } from "../utils";

type PostTrendsToolbarProps = {
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
  generatedAt?: string;
  refreshing: boolean;
  onRefresh: () => void;
};

export function PostTrendsToolbar({
  range,
  onRangeChange,
  generatedAt,
  refreshing,
  onRefresh,
}: PostTrendsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground">{TREND_FORMULA}</p>
        {generatedAt && (
          <p className="text-xs text-muted-foreground/80">
            Cập nhật lúc {formatDateTime(generatedAt)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {TREND_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onRangeChange(opt.value)}
              className={`cursor-pointer rounded-md px-3 py-1 text-sm font-medium transition-colors ${
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
          disabled={refreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>
    </div>
  );
}
