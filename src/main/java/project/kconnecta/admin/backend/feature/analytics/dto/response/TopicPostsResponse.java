package project.kconnecta.admin.backend.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

/** Posts belonging to one topic bucket (drill-down from charts / topic table). */
@Value
@Builder
public class TopicPostsResponse {
    String topic;
    /** Source filter applied, or null for any source. */
    String source;
    String range;
    int postCount;
    List<TopPostResponse> posts;
}
