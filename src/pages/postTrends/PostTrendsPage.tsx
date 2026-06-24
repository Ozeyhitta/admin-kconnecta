import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { PostCoverageSection } from "./components/PostCoverageSection";
import { PostTrendsToolbar } from "./components/PostTrendsToolbar";
import { PostTrendsKpiGrid } from "./components/PostTrendsKpiGrid";
import { TopicBarChart } from "./components/TopicBarChart";
import { TopicLineChart } from "./components/TopicLineChart";
import { TrendAlertsPanel } from "./components/TrendAlertsPanel";
import { TopicTrendTable } from "./components/TopicTrendTable";
import { TopPostsTable } from "./components/TopPostsTable";
import { TopicPostsDialog } from "./components/TopicPostsDialog";
import { usePostTrends } from "./usePostTrends";
import { buildTopicInsight } from "./utils";
import {
  readPostTrendsRange,
  readPostTrendsScrollY,
  writePostTrendsRange,
  writePostTrendsScrollY,
} from "./postTrendsCache";
import type { TopicChartSelection, TopicScorePoint, TopicTrend, TrendRange } from "./types";

const PostTrendsPage = () => {
  const [range, setRange] = React.useState<TrendRange>(readPostTrendsRange);
  const [topicDialogOpen, setTopicDialogOpen] = React.useState(false);
  const [topicSelection, setTopicSelection] = React.useState<TopicChartSelection | null>(null);
  const { data, loading, refreshing, error, refresh } = usePostTrends(range);
  const summary = data?.summary;
  const topicInsight = buildTopicInsight(data);

  const openTopicPosts = React.useCallback((selection: TopicChartSelection) => {
    setTopicSelection(selection);
    setTopicDialogOpen(true);
  }, []);

  const handleChartTopic = React.useCallback(
    (point: TopicScorePoint) => openTopicPosts({ topic: point.topic, source: point.source }),
    [openTopicPosts],
  );

  const handleTableTopic = React.useCallback(
    (t: TopicTrend) => openTopicPosts({ topic: t.topic, source: t.source }),
    [openTopicPosts],
  );

  const handleRangeChange = React.useCallback((next: TrendRange) => {
    writePostTrendsScrollY(window.scrollY);
    setRange(next);
    writePostTrendsRange(next);
  }, []);

  React.useEffect(() => {
    const savedY = readPostTrendsScrollY();
    if (savedY <= 0) return;
    const restore = () => window.scrollTo({ top: savedY, left: 0, behavior: "auto" });
    requestAnimationFrame(() => requestAnimationFrame(restore));
  }, []);

  React.useEffect(() => {
    return () => {
      writePostTrendsScrollY(window.scrollY);
    };
  }, []);

  return (
    <>
      <Breadcrumb>
        <BreadcrumbPage>Phân tích xu hướng bài viết</BreadcrumbPage>
      </Breadcrumb>

      <div className="space-y-6 mb-6">
        <PostTrendsToolbar
          range={range}
          onRangeChange={handleRangeChange}
          generatedAt={summary?.generatedAt}
          refreshing={refreshing}
          onRefresh={refresh}
        />

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!error && topicInsight && !loading && (
          <p className="text-sm text-muted-foreground rounded-lg border border-border/60 bg-muted/30 px-4 py-2.5">
            {topicInsight}
          </p>
        )}

        <PostTrendsKpiGrid summary={summary} loading={loading} />

        <PostCoverageSection summary={summary} loading={loading} />

        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Biểu đồ chủ đề
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Tổng hợp (không gồm #khác)
                </h3>
                <p className="text-xs text-muted-foreground mb-3">Hashtag + từ khóa tự trích</p>
                <TopicBarChart
                  data={loading ? null : data?.chartData.topicBar ?? []}
                  loading={loading}
                  onTopicSelect={handleChartTopic}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Chỉ #hashtag
                </h3>
                <p className="text-xs text-muted-foreground mb-3">User gắn # trong bài</p>
                <TopicBarChart
                  data={loading ? null : data?.chartData.topicBarHashtags ?? []}
                  loading={loading}
                  onTopicSelect={(p) => handleChartTopic({ ...p, source: "HASHTAG" })}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Từ khóa tự trích
                </h3>
                <p className="text-xs text-muted-foreground mb-3">Bài không có # — phân tích nội dung</p>
                <TopicBarChart
                  data={loading ? null : data?.chartData.topicBarKeywords ?? []}
                  loading={loading}
                  onTopicSelect={(p) => handleChartTopic({ ...p, source: "KEYWORD" })}
                />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Diễn biến hashtag theo ngày
              </h3>
              <TopicLineChart
                data={loading ? null : data?.chartData.topicDailyHashtags ?? data?.chartData.topicDaily ?? null}
                loading={loading}
              />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Kiểm duyệt &amp; chủ đề
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Cảnh báo xu hướng
                </h3>
                <TrendAlertsPanel alerts={data?.alerts ?? []} loading={loading} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Bảng chủ đề nổi bật
                </h3>
                <TopicTrendTable
                  topics={data?.topicTrends ?? []}
                  loading={loading}
                  onTopicSelect={handleTableTopic}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Bài viết nổi bật
          </h2>
          <Card>
            <CardContent className="pt-4">
              <TopPostsTable posts={data?.topPosts ?? []} loading={loading} />
            </CardContent>
          </Card>
        </section>
      </div>

      <TopicPostsDialog
        open={topicDialogOpen}
        onOpenChange={setTopicDialogOpen}
        range={range}
        selection={topicSelection}
      />
    </>
  );
};

export default PostTrendsPage;
