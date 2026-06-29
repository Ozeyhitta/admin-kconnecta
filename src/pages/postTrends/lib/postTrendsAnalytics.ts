import type { AnalyticsSummary, PostTrendsResponse, TopPost, TopicTrend } from "../types";

/** Bucket label for posts without hashtag — not a real hashtag for ranking. */
export const FALLBACK_TOPIC = "khác";

export const TREND_WEIGHTS = {
  like: 1,
  comment: 2,
  share: 3,
  report: -5,
} as const;

export type InteractionBreakdownRow = {
  kind: "like" | "comment" | "share" | "report" | "total";
  label: string;
  count: number;
  points: number;
};

export type LeadingHashtag = {
  topic: string;
  score: number;
} | null;

export type AttentionCategory =
  | "reported"
  | "negative_score"
  | "no_hashtag";

export type AttentionGroup = {
  id: AttentionCategory;
  label: string;
  description: string;
  count: number;
  posts: TopPost[];
};

export type PostTrendsDashboard = {
  postsAnalyzed: number;
  postsWithPositiveInteraction: number;
  positiveInteractions: number;
  totalReports: number;
  validHashtagCount: number;
  leadingHashtag: LeadingHashtag;
  avgScorePerPost: number;
  hashtagCoveragePercent: number;
  postsWithoutHashtag: number;
  attentionPostCount: number;
  interactionBreakdown: InteractionBreakdownRow[];
  totalTrendPoints: number;
  realHashtags: TopicTrend[];
  fallbackTopic: TopicTrend | null;
  attentionGroups: AttentionGroup[];
};

export function computeTrendScore(
  likeCount: number,
  commentCount: number,
  shareCount: number,
  reportCount: number,
): number {
  return (
    likeCount * TREND_WEIGHTS.like +
    commentCount * TREND_WEIGHTS.comment +
    shareCount * TREND_WEIGHTS.share +
    reportCount * TREND_WEIGHTS.report
  );
}

export function isFallbackTopic(topic: string): boolean {
  return topic.trim().toLowerCase() === FALLBACK_TOPIC;
}

export function isRealHashtag(topic: TopicTrend): boolean {
  return topic.source === "HASHTAG" && !isFallbackTopic(topic.topic);
}

export function safeNumber(value: number | undefined | null, fallback = 0): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value;
}

export function resolvePositiveInteractions(summary: AnalyticsSummary): number {
  const likes = safeNumber(summary.totalLikes);
  const comments = safeNumber(summary.totalComments);
  const shares = safeNumber(summary.totalShares);
  if (likes + comments + shares > 0) {
    return likes + comments + shares;
  }
  return Math.max(0, safeNumber(summary.totalInteractions) - safeNumber(summary.totalReports));
}

export function resolveLeadingHashtag(
  summary: AnalyticsSummary,
  topics: TopicTrend[],
): LeadingHashtag {
  const fromSummary =
    summary.topHashtagTopic && !isFallbackTopic(summary.topHashtagTopic)
      ? {
          topic: summary.topHashtagTopic,
          score: safeNumber(summary.topHashtagTopicScore),
        }
      : summary.topTopic && !isFallbackTopic(summary.topTopic)
        ? {
            topic: summary.topTopic,
            score: safeNumber(summary.topTopicScore),
          }
        : null;

  const fromTable = [...topics]
    .filter(isRealHashtag)
    .sort((a, b) => b.topicScore - a.topicScore)[0];

  if (!fromSummary && !fromTable) return null;
  if (!fromSummary) {
    return { topic: fromTable.topic, score: fromTable.topicScore };
  }
  if (!fromTable) return fromSummary;

  return fromTable.topicScore > fromSummary.score
    ? { topic: fromTable.topic, score: fromTable.topicScore }
    : fromSummary;
}

export function buildInteractionBreakdown(summary: AnalyticsSummary): InteractionBreakdownRow[] {
  const likes = safeNumber(summary.totalLikes);
  const comments = safeNumber(summary.totalComments);
  const shares = safeNumber(summary.totalShares);
  const reports = safeNumber(summary.totalReports);

  const rows: InteractionBreakdownRow[] = [
    { kind: "like", label: "Like", count: likes, points: likes * TREND_WEIGHTS.like },
    { kind: "comment", label: "Bình luận", count: comments, points: comments * TREND_WEIGHTS.comment },
    { kind: "share", label: "Chia sẻ", count: shares, points: shares * TREND_WEIGHTS.share },
    { kind: "report", label: "Báo cáo", count: reports, points: reports * TREND_WEIGHTS.report },
  ];

  const totalPoints = rows.reduce((sum, row) => sum + row.points, 0);
  return [
    ...rows,
    { kind: "total", label: "Tổng điểm", count: likes + comments + shares + reports, points: totalPoints },
  ];
}

function uniquePosts(posts: TopPost[]): TopPost[] {
  const seen = new Set<string>();
  const result: TopPost[] = [];
  for (const post of posts) {
    if (seen.has(post.postId)) continue;
    seen.add(post.postId);
    result.push(post);
  }
  return result;
}

export function buildAttentionGroups(
  topPosts: TopPost[],
  postsWithoutHashtag: number,
): AttentionGroup[] {
  const reported = uniquePosts(topPosts.filter((p) => p.reportCount > 0));
  const negative = uniquePosts(topPosts.filter((p) => p.trendScore < 0));
  const noHashtag = uniquePosts(topPosts.filter((p) => !p.hasHashtag));

  return [
    {
      id: "reported",
      label: "Bài có báo cáo",
      description: "Có ít nhất một báo cáo trong kỳ (từ top bài nổi bật).",
      count: reported.length,
      posts: reported,
    },
    {
      id: "negative_score",
      label: "Điểm xu hướng âm",
      description: "Báo cáo vượt trọng số tương tác tích cực (từ top bài nổi bật).",
      count: negative.length,
      posts: negative,
    },
    {
      id: "no_hashtag",
      label: "Chưa gắn hashtag",
      description: `${postsWithoutHashtag} bài trong kỳ — bấm để xem danh sách đầy đủ.`,
      count: postsWithoutHashtag,
      posts: noHashtag,
    },
  ];
}

export function buildPostTrendsDashboard(data: PostTrendsResponse | null): PostTrendsDashboard | null {
  if (!data?.summary) return null;

  const { summary, topicTrends, topPosts } = data;
  const realHashtags = topicTrends.filter(isRealHashtag);
  const fallbackTopic =
    topicTrends.find((t) => t.source === "UNCATEGORIZED" || isFallbackTopic(t.topic)) ?? null;
  const interactionBreakdown = buildInteractionBreakdown(summary);
  const totalTrendPoints = interactionBreakdown.find((r) => r.kind === "total")?.points ?? 0;
  const postsWithoutHashtag = safeNumber(summary.postsUncategorized);
  const attentionGroups = buildAttentionGroups(topPosts, postsWithoutHashtag);
  const attentionPostCount = attentionGroups
    .filter((g) => g.id !== "no_hashtag")
    .reduce((sum, g) => sum + g.count, 0);

  return {
    postsAnalyzed: safeNumber(summary.totalPosts),
    postsWithPositiveInteraction: safeNumber(
      summary.postsWithPositiveInteraction,
      resolvePositiveInteractions(summary) > 0 ? summary.totalPosts : 0,
    ),
    positiveInteractions: resolvePositiveInteractions(summary),
    totalReports: safeNumber(summary.totalReports),
    validHashtagCount: safeNumber(summary.hashtagTopicCount, realHashtags.length),
    leadingHashtag: resolveLeadingHashtag(summary, topicTrends),
    avgScorePerPost: safeNumber(summary.avgTrendScore),
    hashtagCoveragePercent: safeNumber(summary.hashtagCoveragePercent),
    postsWithoutHashtag,
    attentionPostCount,
    interactionBreakdown,
    totalTrendPoints,
    realHashtags,
    fallbackTopic,
    attentionGroups,
  };
}

export function sortHashtagRankings(
  topics: TopicTrend[],
  sortKey: "score" | "posts" | "reports" | "interactions",
): TopicTrend[] {
  const real = topics.filter(isRealHashtag);
  const fallback = topics.filter((t) => !isRealHashtag(t));

  const sorted = [...real].sort((a, b) => {
    switch (sortKey) {
      case "posts":
        return b.postCount - a.postCount;
      case "reports":
        return b.reportCount - a.reportCount;
      case "interactions":
        return (
          (b.likeCount ?? 0) + b.commentCount + (b.shareCount ?? 0) -
          ((a.likeCount ?? 0) + a.commentCount + (a.shareCount ?? 0))
        );
      default:
        return b.topicScore - a.topicScore;
    }
  });

  return [...sorted, ...fallback];
}

export function rangeLabel(range: string): string {
  return range === "30d" ? "30 ngày" : "7 ngày";
}
