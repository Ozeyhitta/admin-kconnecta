package project.kconnecta.admin.backend.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

/** Pre-shaped data for the two charts (bar = top topics, line = topic score per day). */
@Value
@Builder
public class ChartDataResponse {

    /** Bar chart: top topics by score. */
    List<TopicScorePoint> topicBar;

    /** Line chart: shared x-axis dates + one series per top topic. */
    TopicDailySeries topicDaily;

    @Value
    @Builder
    public static class TopicScorePoint {
        String topic;
        double score;
        long postCount;
    }

    @Value
    @Builder
    public static class TopicDailySeries {
        /** Ordered x-axis labels (ISO dates) covering the current window. */
        List<String> dates;
        /** One line per topic; each {@code data} list aligns 1:1 with {@code dates}. */
        List<TopicSeries> series;
    }

    @Value
    @Builder
    public static class TopicSeries {
        String topic;
        List<Double> data;
    }
}
