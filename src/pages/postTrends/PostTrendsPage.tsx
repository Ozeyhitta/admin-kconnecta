import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { DayTrendDetailDialog } from "./components/DayTrendDetailDialog";
import { AttentionPostsSheet } from "./components/AttentionPostsSheet";
import { AttentionSection } from "./components/AttentionSection";
import { HashtagRankingTable } from "./components/HashtagRankingTable";
import { InteractionBreakdownTable } from "./components/InteractionBreakdownTable";
import { PostTrendsHeader } from "./components/PostTrendsHeader";
import { PostTrendsMainKpis } from "./components/PostTrendsMainKpis";
import { PostTrendsSecondaryStats } from "./components/PostTrendsSecondaryStats";
import { TopicLineChart, type DayChartSelection } from "./components/TopicLineChart";
import { TopicPostsDialog } from "./components/TopicPostsDialog";
import { TopPostsTable } from "./components/TopPostsTable";
import { TrendAlertsPanel } from "./components/TrendAlertsPanel";
import { usePostTrends } from "./usePostTrends";
import {
  buildPostTrendsDashboard,
  FALLBACK_TOPIC,
  type AttentionCategory,
} from "./lib/postTrendsAnalytics";
import {
  readPostTrendsRange,
  readPostTrendsScrollY,
  writePostTrendsRange,
  writePostTrendsScrollY,
} from "./postTrendsCache";
import type { TopicChartSelection, TopicTrend, TrendRange } from "./types";

const PostTrendsPage = () => {
  const [range, setRange] = React.useState<TrendRange>(readPostTrendsRange);
  const [topicDialogOpen, setTopicDialogOpen] = React.useState(false);
  const [topicSelection, setTopicSelection] = React.useState<TopicChartSelection | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = React.useState<number | null>(null);
  const [attentionOpen, setAttentionOpen] = React.useState(false);
  const [attentionCategory, setAttentionCategory] = React.useState<AttentionCategory | null>(null);

  const { data, loading, refreshing, error, refresh } = usePostTrends(range);
  const dashboard = React.useMemo(() => buildPostTrendsDashboard(data), [data]);

  const openTopicPosts = React.useCallback((selection: TopicChartSelection) => {
    setTopicSelection(selection);
    setTopicDialogOpen(true);
  }, []);

  const handleTableTopic = React.useCallback(
    (t: TopicTrend) => openTopicPosts({ topic: t.topic, source: t.source }),
    [openTopicPosts],
  );

  const chartDailyData = data?.chartData.topicDailyHashtags ?? data?.chartData.topicDaily ?? null;

  const dayPoints = React.useMemo(() => {
    if (selectedDayIndex == null || !chartDailyData) return [];
    return chartDailyData.series
      .map((s) => ({
        topic: s.topic,
        source: s.source,
        score: s.data[selectedDayIndex] ?? 0,
      }))
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [chartDailyData, selectedDayIndex]);

  const handleDaySelect = React.useCallback(({ date, index }: DayChartSelection) => {
    setSelectedDay(date);
    setSelectedDayIndex(index);
    setDayDialogOpen(true);
  }, []);

  const handleDayTopicSelect = React.useCallback(
    (selection: TopicChartSelection) => {
      setDayDialogOpen(false);
      openTopicPosts(selection);
    },
    [openTopicPosts],
  );

  const handleAttentionSelect = React.useCallback(
    (category: AttentionCategory) => {
      if (category === "no_hashtag") {
        openTopicPosts({ topic: FALLBACK_TOPIC, source: "UNCATEGORIZED" });
        return;
      }
      setAttentionCategory(category);
      setAttentionOpen(true);
    },
    [openTopicPosts],
  );

  const handleRangeChange = React.useCallback((next: TrendRange) => {
    writePostTrendsScrollY(window.scrollY);
    setRange(next);
    writePostTrendsRange(next);
  }, []);

  const attentionGroup =
    dashboard?.attentionGroups.find((g) => g.id === attentionCategory) ?? null;

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

  const isEmpty = !loading && !error && dashboard?.postsAnalyzed === 0;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbPage>Phân tích xu hướng bài viết</BreadcrumbPage>
      </Breadcrumb>

      <div className="mb-6 space-y-6">
        <PostTrendsHeader
          range={range}
          onRangeChange={handleRangeChange}
          generatedAt={data?.summary.generatedAt}
          loading={loading}
          refreshing={refreshing}
          error={error}
          onRefresh={refresh}
        />

        {isEmpty ? (
          <Card className="rounded-lg">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Chưa có bài viết có tương tác trong kỳ đã chọn.
            </CardContent>
          </Card>
        ) : (
          <>
            <PostTrendsMainKpis dashboard={dashboard} loading={loading} />
            <PostTrendsSecondaryStats dashboard={dashboard} loading={loading} />

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phân rã tương tác
              </h2>
              <InteractionBreakdownTable
                rows={dashboard?.interactionBreakdown ?? []}
                loading={loading}
              />
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Biểu đồ xu hướng theo ngày
              </h2>
              <Card className="rounded-lg">
                <CardContent className="pt-4">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Top hashtag theo điểm xu hướng mỗi ngày. Bấm vào cột ngày trên biểu đồ để xem chi tiết hashtag.
                  </p>
                  <TopicLineChart
                    data={loading ? null : chartDailyData}
                    loading={loading}
                    onDaySelect={handleDaySelect}
                  />
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bảng xếp hạng hashtag
              </h2>
              <Card className="rounded-lg">
                <CardContent className="pt-4">
                  <HashtagRankingTable
                    topics={data?.topicTrends ?? []}
                    loading={loading}
                    onTopicSelect={handleTableTopic}
                  />
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bài cần chú ý
              </h2>
              <AttentionSection
                groups={dashboard?.attentionGroups ?? []}
                loading={loading}
                onSelect={handleAttentionSelect}
              />
            </section>

            <section className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cảnh báo hệ thống
                </h2>
                <Card className="rounded-lg">
                  <CardContent className="pt-4">
                    <TrendAlertsPanel alerts={data?.alerts ?? []} loading={loading} />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bài viết nổi bật
                </h2>
                <Card className="rounded-lg">
                  <CardContent className="pt-4">
                    <TopPostsTable posts={data?.topPosts ?? []} loading={loading} />
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        )}
      </div>

      <DayTrendDetailDialog
        open={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
        date={selectedDay}
        points={dayPoints}
        onTopicSelect={handleDayTopicSelect}
      />

      <TopicPostsDialog
        open={topicDialogOpen}
        onOpenChange={setTopicDialogOpen}
        range={range}
        selection={topicSelection}
      />

      <AttentionPostsSheet
        open={attentionOpen}
        onOpenChange={setAttentionOpen}
        group={attentionGroup}
      />
    </>
  );
};

export default PostTrendsPage;
