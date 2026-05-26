package project.kconnecta.admin.backend.feature.stats.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.feature.activitylog.repository.UserActivityLogRepository;
import project.kconnecta.admin.backend.feature.stats.dto.response.DauMauResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.DayCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.DauMauTrendPointResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.HourCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.OnlineUsersResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.OverviewStatsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.PeriodCountResponse;
import project.kconnecta.admin.backend.feature.user.repository.AccountRepository;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StatsAdminServiceImpl implements StatsAdminService {

    private final AccountRepository accountRepository;
    private final UserActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    @Override
    public OverviewStatsResponse getOverview() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);
        LocalDateTime sevenAgo = todayStart.minusDays(7);
        LocalDateTime fourteenAgo = todayStart.minusDays(14);
        LocalDateTime thirtyAgo = todayStart.minusDays(30);
        LocalDateTime fiveMinAgo = LocalDateTime.now().minusMinutes(5);

        long newUsersThisWeek = accountRepository.countByCreatedAtBetween(sevenAgo, todayEnd);
        long newUsersLastWeek = accountRepository.countByCreatedAtBetween(fourteenAgo, sevenAgo);
        double userGrowthPct = growthPercent(newUsersThisWeek, newUsersLastWeek);

        long postsThisWeek = activityLogRepository.countByActionTypeAndCreatedAtBetween(
                "POST_CREATED", sevenAgo, todayEnd);
        long postsLastWeek = activityLogRepository.countByActionTypeAndCreatedAtBetween(
                "POST_CREATED", fourteenAgo, sevenAgo);
        double postsGrowthPct = growthPercent(postsThisWeek, postsLastWeek);

        long dau = activityLogRepository.countDistinctActiveUsersBetween(todayStart, todayEnd);
        long mau = activityLogRepository.countDistinctActiveUsersBetween(thirtyAgo, todayEnd);
        double dauMauRatio = mau == 0 ? 0.0 : Math.round(dau * 1000.0 / mau) / 10.0;

        return OverviewStatsResponse.builder()
                .totalUsers(accountRepository.count())
                .activeUsers(accountRepository.countByStatus(AccountStatus.ACTIVE))
                .inactiveUsers(accountRepository.countByStatus(AccountStatus.INACTIVE))
                .newUsersLast30Days(accountRepository.countByCreatedAtBetween(thirtyAgo, todayEnd))
                .newUsersThisWeek(newUsersThisWeek)
                .newUsersLastWeek(newUsersLastWeek)
                .userGrowthPercent(userGrowthPct)
                .dau(dau)
                .mau(mau)
                .dauMauRatio(dauMauRatio)
                .onlineUsersNow(userRepository.countOnlineSince(fiveMinAgo))
                .activityToday(activityLogRepository.countByCreatedAtBetween(todayStart, todayEnd))
                .activityLast7Days(activityLogRepository.countByCreatedAtBetween(sevenAgo, todayEnd))
                .loginsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween(
                        "LOGIN", todayStart, todayEnd))
                .postsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween(
                        "POST_CREATED", todayStart, todayEnd))
                .commentsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween(
                        "COMMENT_ADDED", todayStart, todayEnd))
                .sharesToday(activityLogRepository.countByActionTypeAndCreatedAtBetween(
                        "POST_SHARED", todayStart, todayEnd))
                .reactionsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween(
                        "REACTION_ADDED", todayStart, todayEnd))
                .friendRequestsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween(
                        "FRIEND_REQUEST_SENT", todayStart, todayEnd))
                .postsThisWeek(postsThisWeek)
                .postsLastWeek(postsLastWeek)
                .postsGrowthPercent(postsGrowthPct)
                .build();
    }

    @Override
    public OnlineUsersResponse getOnlineUsers() {
        return OnlineUsersResponse.builder()
                .online(userRepository.countOnlineSince(LocalDateTime.now().minusMinutes(5)))
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Override
    public List<PeriodCountResponse> getNewUsers(String period) {
        return mapPeriodRows(switch (period) {
            case "week" -> accountRepository.countNewUsersByWeek();
            case "month" -> accountRepository.countNewUsersByMonth();
            default -> accountRepository.countNewUsersByDay();
        });
    }

    @Override
    public DauMauResponse getDauMau() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);
        LocalDateTime thirtyAgo = todayStart.minusDays(30);

        long dau = activityLogRepository.countDistinctActiveUsersBetween(todayStart, todayEnd);
        long mau = activityLogRepository.countDistinctActiveUsersBetween(thirtyAgo, todayEnd);
        double ratio = mau == 0 ? 0.0 : Math.round(dau * 1000.0 / mau) / 10.0;

        List<DauMauTrendPointResponse> dauTrend = activityLogRepository.getDauByDay().stream()
                .map(r -> DauMauTrendPointResponse.builder()
                        .day(r[0].toString())
                        .count(((Number) r[1]).longValue())
                        .build())
                .toList();

        return DauMauResponse.builder()
                .dau(dau)
                .mau(mau)
                .dauMauRatio(ratio)
                .dauTrend(dauTrend)
                .build();
    }

    @Override
    public List<PeriodCountResponse> getInteractions(String period) {
        return mapPeriodRows(switch (period) {
            case "week" -> activityLogRepository.getInteractionsByWeek();
            case "month" -> activityLogRepository.getInteractionsByMonth();
            default -> activityLogRepository.getInteractionsByDay();
        });
    }

    @Override
    public List<HourCountResponse> getActivityByHour() {
        return activityLogRepository.getActivityCountByHour().stream()
                .map(r -> HourCountResponse.builder()
                        .hour(((Number) r[0]).intValue())
                        .count(((Number) r[1]).longValue())
                        .build())
                .toList();
    }

    @Override
    public List<DayCountResponse> getActivityByDay() {
        return activityLogRepository.getActivityCountByDay().stream()
                .map(r -> DayCountResponse.builder()
                        .day(r[0].toString())
                        .count(((Number) r[1]).longValue())
                        .build())
                .toList();
    }

    private List<PeriodCountResponse> mapPeriodRows(List<Object[]> rows) {
        return rows.stream()
                .map(r -> PeriodCountResponse.builder()
                        .period(r[0].toString())
                        .count(((Number) r[1]).longValue())
                        .build())
                .toList();
    }

    private static double growthPercent(long current, long previous) {
        if (previous == 0) {
            return current > 0 ? 100.0 : 0.0;
        }
        return Math.round((current - previous) * 1000.0 / previous) / 10.0;
    }
}
