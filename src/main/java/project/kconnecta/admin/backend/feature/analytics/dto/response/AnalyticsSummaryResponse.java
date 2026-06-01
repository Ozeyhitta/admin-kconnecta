package project.kconnecta.admin.backend.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

/** High-level numbers for the summary cards at the top of the analytics page. */
@Value
@Builder
public class AnalyticsSummaryResponse {
    /** Echoes the requested range, e.g. "7d" or "30d". */
    String range;
    /** Number of posts that had at least one interaction in the current window. */
    long totalPosts;
    /** like + comment + share + report counts in the current window. */
    long totalInteractions;
    /** Total reports in the current window (moderation signal). */
    long totalReports;
    /** Distinct hashtag-topics discovered in the current window. */
    int totalTopics;
    /** Number of alerts raised. */
    int totalAlerts;
    /** Highest-scoring topic name (without the leading '#'). */
    String topTopic;
    /** Score of the highest-scoring topic. */
    double topTopicScore;
    /** Average trend_score across analysed posts (rounded to 1 decimal). */
    double avgTrendScore;
    /** Server time the snapshot was computed. */
    LocalDateTime generatedAt;
}
