import {
  FileText,
  Activity,
  Flag,
  Hash,
  TrendingUp,
  AlertTriangle,
  Gauge,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsSummary } from "../types";
import { fmt, reportRatePercent } from "../utils";

type KpiCardProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>;
  iconColor: string;
  title: string;
  value: number | string | undefined;
  sub?: string;
  loading?: boolean;
  /** Hiển thị giá trị dạng chữ dài (hashtag) — xuống dòng thay vì cắt. */
  wrapValue?: boolean;
};

const KpiCard = ({
  icon: Icon,
  iconColor,
  title,
  value,
  sub,
  loading,
  wrapValue = false,
}: KpiCardProps) => {
  const display =
    value !== undefined ? (typeof value === "number" ? fmt.format(value) : value) : "—";

  return (
    <Card className={`flex-1 p-4 sm:p-5 ${wrapValue ? "min-w-[160px]" : "min-w-[150px]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-9 w-20 mt-1" />
          ) : (
            <p
              className={
                wrapValue
                  ? "text-base sm:text-lg font-bold mt-1 leading-snug break-words"
                  : "text-2xl sm:text-3xl font-bold mt-1 tabular-nums truncate"
              }
              title={wrapValue && typeof value === "string" ? value : undefined}
            >
              {display}
            </p>
          )}
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <Icon className={`h-7 w-7 sm:h-8 sm:w-8 shrink-0 opacity-55 ${iconColor}`} />
      </div>
    </Card>
  );
};

type PostTrendsKpiGridProps = {
  summary: AnalyticsSummary | undefined;
  loading: boolean;
};

export function PostTrendsKpiGrid({ summary, loading }: PostTrendsKpiGridProps) {
  const reportRate = summary
    ? reportRatePercent(summary.totalReports, summary.totalInteractions)
    : null;

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      <KpiCard
        icon={FileText}
        iconColor="text-indigo-500"
        title="Bài phân tích"
        value={summary?.totalPosts}
        loading={loading}
      />
      <KpiCard
        icon={Activity}
        iconColor="text-amber-500"
        title="Tương tác"
        value={summary?.totalInteractions}
        loading={loading}
      />
      <KpiCard
        icon={Flag}
        iconColor="text-red-500"
        title="Báo cáo"
        value={summary?.totalReports}
        sub={reportRate != null ? `${reportRate.toFixed(1)}% tổng tương tác` : undefined}
        loading={loading}
      />
      <KpiCard
        icon={Hash}
        iconColor="text-primary"
        title="Chủ đề"
        value={summary?.totalTopics}
        loading={loading}
      />
      <KpiCard
        icon={Gauge}
        iconColor="text-violet-500"
        title="Điểm TB / bài"
        value={summary ? summary.avgTrendScore.toFixed(1) : undefined}
        loading={loading}
      />
      <KpiCard
        icon={TrendingUp}
        iconColor="text-blue-500"
        title="Chủ đề dẫn đầu"
        value={summary?.topTopic ? `#${summary.topTopic}` : "—"}
        sub={summary ? `${fmt.format(summary.topTopicScore)} điểm` : undefined}
        loading={loading}
        wrapValue
      />
      <KpiCard
        icon={AlertTriangle}
        iconColor="text-orange-500"
        title="Cảnh báo"
        value={summary?.totalAlerts}
        loading={loading}
      />
    </section>
  );
}
