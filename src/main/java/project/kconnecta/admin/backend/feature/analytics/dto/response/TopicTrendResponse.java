package project.kconnecta.admin.backend.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

/** One row of the "topic trends" table / bar chart. */
@Value
@Builder
public class TopicTrendResponse {
    /** Hashtag topic name without the leading '#'. */
    String topic;
    /** How many posts in the current window carry this hashtag. */
    long postCount;
    /** Sum of member posts' trend_score in the current window. */
    double topicScore;
    /** Sum of member posts' trend_score in the previous window (for growth). */
    double previousScore;
    /** (current - previous) / |previous| * 100, with previous == 0 handled. */
    double growthRate;
    /** "Tăng mạnh" | "Tăng" | "Ổn định" | "Giảm". */
    String trendLabel;
    /** Reports on this topic's posts in the current window. */
    long reportCount;
    /** Comments on this topic's posts in the current window. */
    long commentCount;
}
