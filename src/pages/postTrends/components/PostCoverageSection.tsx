import { Hash, Sparkles, HelpCircle, Percent } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsSummary } from "../types";
import { fmt } from "../utils";

type CoverageCardProps = {
  title: string;
  value: string;
  sub?: string;
  icon: React.FC<{ className?: string }>;
  iconColor: string;
  loading?: boolean;
};

const CoverageCard = ({ title, value, sub, icon: Icon, iconColor, loading }: CoverageCardProps) => (
  <Card className="p-4">
    <div className="flex items-start gap-3">
      <Icon className={`h-6 w-6 shrink-0 opacity-70 ${iconColor}`} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        {loading ? (
          <Skeleton className="h-7 w-24 mt-1" />
        ) : (
          <p className="text-xl font-bold tabular-nums mt-0.5">{value}</p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  </Card>
);

type PostCoverageSectionProps = {
  summary: AnalyticsSummary | undefined;
  loading: boolean;
};

export function PostCoverageSection({ summary, loading }: PostCoverageSectionProps) {
  const s = summary;
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Phân loại nội dung bài viết
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CoverageCard
          title="Có #hashtag"
          value={s ? `${s.hashtagCoveragePercent.toFixed(0)}%` : "—"}
          sub={s ? `${fmt.format(s.postsWithHashtag)} / ${fmt.format(s.totalPosts)} bài` : undefined}
          icon={Percent}
          iconColor="text-indigo-500"
          loading={loading}
        />
        <CoverageCard
          title="Hashtag thật"
          value={s ? fmt.format(s.postsWithHashtag) : "—"}
          sub={s?.topHashtagTopic ? `Top: #${s.topHashtagTopic}` : "Chưa có hashtag nổi bật"}
          icon={Hash}
          iconColor="text-violet-500"
          loading={loading}
        />
        <CoverageCard
          title="Từ khóa tự trích"
          value={s ? fmt.format(s.postsWithKeywordOnly) : "—"}
          sub={s?.topKeywordTopic ? `Top: ⌗${s.topKeywordTopic}` : "Từ nội dung không có #"}
          icon={Sparkles}
          iconColor="text-amber-500"
          loading={loading}
        />
        <CoverageCard
          title="Không phân loại"
          value={s ? fmt.format(s.postsUncategorized) : "—"}
          sub={s ? `${fmt.format(s.uncategorizedPostCount)} bài trong nhóm #khác` : undefined}
          icon={HelpCircle}
          iconColor="text-slate-500"
          loading={loading}
        />
      </div>
    </section>
  );
}
