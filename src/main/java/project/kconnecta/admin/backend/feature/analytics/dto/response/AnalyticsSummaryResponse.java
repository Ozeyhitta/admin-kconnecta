package project.kconnecta.admin.backend.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

/** High-level numbers for the summary cards at the top of the analytics page. */
@Value
@Builder
public class AnalyticsSummaryResponse {
    String range;
    long totalPosts;
    long totalInteractions;
    long totalReports;
    long totalLikes;
    long totalComments;
    long totalShares;
    /** Posts with at least one like, comment, or share in the window. */
    long postsWithPositiveInteraction;
    /** Distinct topic buckets (hashtag + keyword + uncategorized). */
    int totalTopics;
    int totalAlerts;
    String topTopic;
    double topTopicScore;
    double avgTrendScore;
    LocalDateTime generatedAt;

    /** Posts with at least one #hashtag in content. */
    long postsWithHashtag;
    /** Posts without hashtag but assigned topics via keyword extraction. */
    long postsWithKeywordOnly;
    /** Posts with no hashtag and no extractable keywords (#khác). */
    long postsUncategorized;
    /** Share of posts that have at least one hashtag (0–100). */
    double hashtagCoveragePercent;

    int hashtagTopicCount;
    int keywordTopicCount;

    String topHashtagTopic;
    double topHashtagTopicScore;
    String topKeywordTopic;
    double topKeywordTopicScore;

    long uncategorizedPostCount;
    double uncategorizedTopicScore;
}
