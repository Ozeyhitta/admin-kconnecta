package project.kconnecta.admin.backend.feature.stats.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SystemOverviewResponse {
    long totalUsers;
    long activeUsers;
    long lockedUsers;
    long onlineUsersNow;
    long totalPosts;
    long totalComments;
    long totalReports;
}
