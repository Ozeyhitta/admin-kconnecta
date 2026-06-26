package project.kconnecta.admin.backend.feature.analytics.service;

import project.kconnecta.admin.backend.feature.analytics.dto.response.PostTrendsResponse;
import project.kconnecta.admin.backend.feature.analytics.dto.response.TopicPostsResponse;

public interface PostTrendsAnalyticsService {

    /**
     * Builds the full post-trends analytics snapshot.
     *
     * @param range "7d" or "30d" (anything else falls back to 7d)
     */
    PostTrendsResponse getPostTrends(String range);

    /**
     * Lists posts assigned to a topic, sorted by trend score descending.
     *
     * @param source optional HASHTAG | KEYWORD | UNCATEGORIZED filter
     */
    TopicPostsResponse getTopicPosts(String range, String topic, String source, String date);
}
