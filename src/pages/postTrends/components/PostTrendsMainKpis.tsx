import { Activity, FileText, Flag, Hash, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostTrendsDashboard } from "../lib/postTrendsAnalytics";
import { fmt } from "../utils";

type KpiCardProps = {
  title: string;
  value: string;
  sub?: string;
  icon: React.FC<{ className?: string }>;
  iconClass: string;
  loading?: boolean;
  valueClass?: string;
};

function KpiCard({ title, value, sub, icon: Icon, iconClass, loading, valueClass }: KpiCardProps) {
  return (
    <Card className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className={`mt-1 text-2xl font-bold tabular-nums ${valueClass ?? ""}`}>{value}</p>
          )}
          {sub && !loading && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <Icon className={`h-6 w-6 shrink-0 opacity-60 ${iconClass}`} />
      </div>
    </Card>
  );
}

type PostTrendsMainKpisProps = {
  dashboard: PostTrendsDashboard | null;
  loading: boolean;
};

export function PostTrendsMainKpis({ dashboard, loading }: PostTrendsMainKpisProps) {
  const leading = dashboard?.leadingHashtag;

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        title="Bài được phân tích"
        value={dashboard ? fmt.format(dashboard.postsAnalyzed) : "—"}
        sub={
          dashboard
            ? `${fmt.format(dashboard.postsWithPositiveInteraction)} bài có tương tác tích cực`
            : undefined
        }
        icon={FileText}
        iconClass="text-indigo-500"
        loading={loading}
      />
      <KpiCard
        title="Tổng tương tác"
        value={dashboard ? fmt.format(dashboard.positiveInteractions) : "—"}
        sub="Like + bình luận + chia sẻ"
        icon={Activity}
        iconClass="text-emerald-600"
        loading={loading}
      />
      <KpiCard
        title="Tổng báo cáo"
        value={dashboard ? fmt.format(dashboard.totalReports) : "—"}
        sub={dashboard?.totalReports === 0 ? "Không có báo cáo" : undefined}
        icon={Flag}
        iconClass={dashboard && dashboard.totalReports > 0 ? "text-red-500" : "text-slate-400"}
        loading={loading}
        valueClass={dashboard && dashboard.totalReports > 0 ? "text-red-600" : undefined}
      />
      <KpiCard
        title="Hashtag hợp lệ"
        value={dashboard ? fmt.format(dashboard.validHashtagCount) : "—"}
        sub="Hashtag có dữ liệu trong kỳ"
        icon={Hash}
        iconClass="text-violet-500"
        loading={loading}
      />
      <KpiCard
        title="Chủ đề dẫn đầu"
        value={leading ? `#${leading.topic}` : "—"}
        sub={leading ? `${fmt.format(leading.score)} điểm` : "Chưa có hashtag nổi bật"}
        icon={TrendingUp}
        iconClass="text-blue-500"
        loading={loading}
        valueClass="text-base sm:text-xl break-words"
      />
    </section>
  );
}
