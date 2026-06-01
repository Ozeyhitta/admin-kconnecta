package project.kconnecta.admin.backend.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** One row of the "top posts" table. */
@Value
@Builder
public class TopPostResponse {
    UUID postId;
    /** Truncated content preview (posts have no title in this schema). */
    String content;
    UUID authorId;
    String authorName;
    String authorUsername;
    String authorAvatarUrl;
    /** Post status (PUBLISHED / HIDDEN / ...). */
    String status;
    LocalDateTime createdAt;

    double trendScore;
    double previousScore;
    double growthRate;
    String trendLabel;

    long likeCount;
    long commentCount;
    long shareCount;
    long reportCount;

    /** Hashtag topics this post belongs to. */
    List<String> topics;
}
