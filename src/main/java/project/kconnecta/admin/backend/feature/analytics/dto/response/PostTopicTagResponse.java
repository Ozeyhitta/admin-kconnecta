package project.kconnecta.admin.backend.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

/** How a post was assigned to a topic bucket for analytics. */
@Value
@Builder
public class PostTopicTagResponse {
    String topic;
    /** HASHTAG | KEYWORD | UNCATEGORIZED */
    String source;
}
