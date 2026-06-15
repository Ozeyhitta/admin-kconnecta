package project.kconnecta.admin.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PostStatsResponse {
    long reactionCount;
    long commentCount;
    long shareCount;
    long reportCount;
}
