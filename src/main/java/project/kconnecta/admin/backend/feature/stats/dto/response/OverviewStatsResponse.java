package project.kconnecta.admin.backend.feature.stats.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class OverviewStatsResponse {
    long totalUsers;
    long activeUsers;
    long inactiveUsers;
    long newUsersLast30Days;
    long newUsersThisWeek;
    long newUsersLastWeek;
    double userGrowthPercent;
    long dau;
    long mau;
    double dauMauRatio;
    long onlineUsersNow;
    long activityToday;
    long activityLast7Days;
    long loginsToday;
    long postsToday;
    long commentsToday;
    long sharesToday;
    long reactionsToday;
    long friendRequestsToday;
    long postsThisWeek;
    long postsLastWeek;
    double postsGrowthPercent;
}
