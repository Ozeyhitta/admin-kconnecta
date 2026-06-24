package project.kconnecta.admin.backend.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

/** One row of the "topic trends" table / bar chart. */
@Value
@Builder
public class TopicTrendResponse {
    String topic;
    /** HASHTAG | KEYWORD | UNCATEGORIZED */
    String source;
    long postCount;
    double topicScore;
    double previousScore;
    double growthRate;
    String trendLabel;
    long reportCount;
    long commentCount;
}
