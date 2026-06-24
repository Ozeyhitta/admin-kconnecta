package project.kconnecta.admin.backend.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

/** Pre-shaped data for topic charts. */
@Value
@Builder
public class ChartDataResponse {

    /** Top topics excluding uncategorized (#khác). */
    List<TopicScorePoint> topicBar;

    /** Top hashtag-only topics (excludes #khác). */
    List<TopicScorePoint> topicBarHashtags;

    /** Top auto-extracted keyword topics. */
    List<TopicScorePoint> topicBarKeywords;

    TopicDailySeries topicDaily;
    TopicDailySeries topicDailyHashtags;

    @Value
    @Builder
    public static class TopicScorePoint {
        String topic;
        double score;
        long postCount;
        /** HASHTAG | KEYWORD */
        String source;
    }

    @Value
    @Builder
    public static class TopicDailySeries {
        List<String> dates;
        List<TopicSeries> series;
    }

    @Value
    @Builder
    public static class TopicSeries {
        String topic;
        List<Double> data;
        String source;
    }
}
