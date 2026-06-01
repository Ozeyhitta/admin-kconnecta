package project.kconnecta.admin.backend.feature.analytics.service;

import project.kconnecta.admin.backend.feature.analytics.dto.response.PostTrendsResponse;

public interface PostTrendsAnalyticsService {

    /**
     * Builds the full post-trends analytics snapshot.
     *
     * @param range "7d" or "30d" (anything else falls back to 7d)
     */
    PostTrendsResponse getPostTrends(String range);
}
