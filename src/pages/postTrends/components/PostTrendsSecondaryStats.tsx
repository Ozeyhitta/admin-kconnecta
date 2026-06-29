import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/common/tooltip";
import type { PostTrendsDashboard } from "../lib/postTrendsAnalytics";
import { fmt } from "../utils";

type StatItemProps = {
  label: string;
  value: string;
  hint: string;
};

function StatItem({ label, value, hint }: StatItemProps) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={hint}>
            <CircleHelp className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {hint}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

type PostTrendsSecondaryStatsProps = {
  dashboard: PostTrendsDashboard | null;
  loading: boolean;
};

export function PostTrendsSecondaryStats({ dashboard, loading }: PostTrendsSecondaryStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg border bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <StatItem
        label="Điểm trung bình / bài"
        value={dashboard.avgScorePerPost.toFixed(1)}
        hint="Tổng điểm xu hướng chia cho số bài được phân tích trong kỳ."
      />
      <StatItem
        label="Tỷ lệ bài có hashtag"
        value={`${dashboard.hashtagCoveragePercent.toFixed(0)}%`}
        hint={`${fmt.format(dashboard.postsAnalyzed - dashboard.postsWithoutHashtag)} / ${fmt.format(dashboard.postsAnalyzed)} bài có hashtag hợp lệ.`}
      />
      <StatItem
        label="Bài cần chú ý"
        value={fmt.format(dashboard.attentionPostCount)}
        hint="Số bài có báo cáo hoặc điểm xu hướng âm trong top bài nổi bật."
      />
    </div>
  );
}
