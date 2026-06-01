package project.kconnecta.admin.backend.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

/** Top-level payload for GET /api/v1/admin/analytics/post-trends. */
@Value
@Builder
public class PostTrendsResponse {
    AnalyticsSummaryResponse summary;
    List<TopicTrendResponse> topicTrends;
    List<TopPostResponse> topPosts;
    List<TrendAlertResponse> alerts;
    ChartDataResponse chartData;
}
