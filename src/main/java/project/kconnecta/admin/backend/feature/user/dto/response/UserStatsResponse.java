package project.kconnecta.admin.backend.feature.user.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class UserStatsResponse {
    long totalPosts;
    long totalComments;
    long totalReactions;
    long totalShares;
    long totalFriendRequests;
    long totalLogins;
    long totalActivity;
}
