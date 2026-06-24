export type TrendRange = "7d" | "30d";

export type TopicSource = "HASHTAG" | "KEYWORD" | "UNCATEGORIZED";

export interface PostTopicTag {
  topic: string;
  source: TopicSource;
}

export interface AnalyticsSummary {
  range: string;
  totalPosts: number;
  totalInteractions: number;
  totalReports: number;
  totalTopics: number;
  totalAlerts: number;
  topTopic: string | null;
  topTopicScore: number;
  avgTrendScore: number;
  generatedAt: string;
  postsWithHashtag: number;
  postsWithKeywordOnly: number;
  postsUncategorized: number;
  hashtagCoveragePercent: number;
  hashtagTopicCount: number;
  keywordTopicCount: number;
  topHashtagTopic: string | null;
  topHashtagTopicScore: number;
  topKeywordTopic: string | null;
  topKeywordTopicScore: number;
  uncategorizedPostCount: number;
  uncategorizedTopicScore: number;
}

export interface TopicTrend {
  topic: string;
  source: TopicSource;
  postCount: number;
  topicScore: number;
  previousScore: number;
  growthRate: number;
  trendLabel: string;
  reportCount: number;
  commentCount: number;
}

export interface TopPost {
  postId: string;
  content: string;
  authorId: string | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  status: string | null;
  createdAt: string;
  trendScore: number;
  previousScore: number;
  growthRate: number;
  trendLabel: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  reportCount: number;
  topics: string[];
  topicTags?: PostTopicTag[];
  hasHashtag: boolean;
}

export interface TrendAlert {
  id: string;
  type: string;
  severity: "HIGH" | "MEDIUM" | "INFO";
  scope: string;
  targetId: string;
  targetLabel: string;
  title: string;
  message: string;
  metrics: Record<string, unknown>;
}

export interface TopicScorePoint {
  topic: string;
  score: number;
  postCount: number;
  source?: TopicSource;
}

export interface ChartData {
  topicBar: TopicScorePoint[];
  topicBarHashtags: TopicScorePoint[];
  topicBarKeywords: TopicScorePoint[];
  topicDaily: { dates: string[]; series: { topic: string; data: number[]; source?: TopicSource }[] };
  topicDailyHashtags: { dates: string[]; series: { topic: string; data: number[]; source?: TopicSource }[] };
}

export interface PostTrendsResponse {
  summary: AnalyticsSummary;
  topicTrends: TopicTrend[];
  topPosts: TopPost[];
  alerts: TrendAlert[];
  chartData: ChartData;
}

export interface TopicPostsResponse {
  topic: string;
  source: TopicSource | null;
  range: string;
  postCount: number;
  posts: TopPost[];
}

export type TopicChartSelection = {
  topic: string;
  source?: TopicSource;
};
