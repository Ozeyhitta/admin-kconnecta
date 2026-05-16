package project.kconnecta.admin.backend.feature.stats.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class OverviewStatsResponse {
    // Users
    long totalUsers;
    long activeUsers;
    long inactiveUsers;
    long newUsersLast30Days;

    // Growth (week-over-week)
    long newUsersThisWeek;
    long newUsersLastWeek;
    double userGrowthPercent;

    // DAU / MAU
    long dau;
    long mau;
    double dauMauRatio;

    // Online
    long onlineUsersNow;

    // Activity totals
    long activityToday;
    long activityLast7Days;

    // Per-type today
    long loginsToday;
    long postsToday;
    long commentsToday;
    long sharesToday;
    long reactionsToday;
    long friendRequestsToday;

    // Post growth (week-over-week)
    long postsThisWeek;
    long postsLastWeek;
    double postsGrowthPercent;
}
