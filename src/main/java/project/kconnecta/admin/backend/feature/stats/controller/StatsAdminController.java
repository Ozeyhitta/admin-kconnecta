package project.kconnecta.admin.backend.feature.stats.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.feature.activitylog.repository.UserActivityLogRepository;
import project.kconnecta.admin.backend.feature.stats.dto.OverviewStatsResponse;
import project.kconnecta.admin.backend.feature.user.repository.AccountRepository;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/stats")
@RequiredArgsConstructor
public class StatsAdminController {

    private final AccountRepository accountRepository;
    private final UserActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    @GetMapping("/overview")
    public ResponseEntity<OverviewStatsResponse> getOverview() {
        LocalDateTime todayStart   = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd     = LocalDate.now().atTime(LocalTime.MAX);
        LocalDateTime sevenAgo     = todayStart.minusDays(7);
        LocalDateTime fourteenAgo  = todayStart.minusDays(14);
        LocalDateTime thirtyAgo    = todayStart.minusDays(30);
        LocalDateTime fiveMinAgo   = LocalDateTime.now().minusMinutes(5);

        long newUsersThisWeek = accountRepository.countByCreatedAtBetween(sevenAgo, todayEnd);
        long newUsersLastWeek = accountRepository.countByCreatedAtBetween(fourteenAgo, sevenAgo);
        double userGrowthPct  = growthPercent(newUsersThisWeek, newUsersLastWeek);

        long postsThisWeek = activityLogRepository.countByActionTypeAndCreatedAtBetween("POST_CREATED", sevenAgo, todayEnd);
        long postsLastWeek = activityLogRepository.countByActionTypeAndCreatedAtBetween("POST_CREATED", fourteenAgo, sevenAgo);
        double postsGrowthPct = growthPercent(postsThisWeek, postsLastWeek);

        long dau = activityLogRepository.countDistinctActiveUsersBetween(todayStart, todayEnd);
        long mau = activityLogRepository.countDistinctActiveUsersBetween(thirtyAgo, todayEnd);
        double dauMauRatio = mau == 0 ? 0.0 : Math.round(dau * 1000.0 / mau) / 10.0;

        OverviewStatsResponse stats = OverviewStatsResponse.builder()
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
                .loginsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween("LOGIN", todayStart, todayEnd))
                .postsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween("POST_CREATED", todayStart, todayEnd))
                .commentsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween("COMMENT_ADDED", todayStart, todayEnd))
                .sharesToday(activityLogRepository.countByActionTypeAndCreatedAtBetween("POST_SHARED", todayStart, todayEnd))
                .reactionsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween("REACTION_ADDED", todayStart, todayEnd))
                .friendRequestsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween("FRIEND_REQUEST_SENT", todayStart, todayEnd))
                .postsThisWeek(postsThisWeek)
                .postsLastWeek(postsLastWeek)
                .postsGrowthPercent(postsGrowthPct)
                .build();

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/online")
    public ResponseEntity<Map<String, Object>> getOnlineUsers() {
        long count = userRepository.countOnlineSince(LocalDateTime.now().minusMinutes(5));
        return ResponseEntity.ok(Map.of("online", count, "updatedAt", LocalDateTime.now().toString()));
    }

    @GetMapping("/new-users")
    public ResponseEntity<List<Map<String, Object>>> getNewUsers(
            @RequestParam(defaultValue = "day") String period) {

        List<Object[]> rows = switch (period) {
            case "week"  -> accountRepository.countNewUsersByWeek();
            case "month" -> accountRepository.countNewUsersByMonth();
            default      -> accountRepository.countNewUsersByDay();
        };

        List<Map<String, Object>> result = rows.stream()
                .map(r -> Map.<String, Object>of("period", r[0].toString(), "count", r[1]))
                .toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/dau-mau")
    public ResponseEntity<Map<String, Object>> getDauMau() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd   = LocalDate.now().atTime(LocalTime.MAX);
        LocalDateTime thirtyAgo  = todayStart.minusDays(30);

        long dau = activityLogRepository.countDistinctActiveUsersBetween(todayStart, todayEnd);
        long mau = activityLogRepository.countDistinctActiveUsersBetween(thirtyAgo, todayEnd);
        double ratio = mau == 0 ? 0.0 : Math.round(dau * 1000.0 / mau) / 10.0;

        List<Object[]> dauRows = activityLogRepository.getDauByDay();
        List<Map<String, Object>> dauTrend = dauRows.stream()
                .map(r -> Map.<String, Object>of("day", r[0].toString(), "count", r[1]))
                .toList();

        return ResponseEntity.ok(Map.of(
                "dau", dau,
                "mau", mau,
                "dauMauRatio", ratio,
                "dauTrend", dauTrend
        ));
    }

    @GetMapping("/interactions")
    public ResponseEntity<List<Map<String, Object>>> getInteractions(
            @RequestParam(defaultValue = "day") String period) {

        List<Object[]> rows = switch (period) {
            case "week"  -> activityLogRepository.getInteractionsByWeek();
            case "month" -> activityLogRepository.getInteractionsByMonth();
            default      -> activityLogRepository.getInteractionsByDay();
        };

        List<Map<String, Object>> result = rows.stream()
                .map(r -> Map.<String, Object>of("period", r[0].toString(), "count", r[1]))
                .toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/activity-by-hour")
    public ResponseEntity<List<Map<String, Object>>> getActivityByHour() {
        List<Object[]> rows = activityLogRepository.getActivityCountByHour();
        List<Map<String, Object>> result = rows.stream()
                .map(r -> Map.<String, Object>of("hour", r[0], "count", r[1]))
                .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/activity-by-day")
    public ResponseEntity<List<Map<String, Object>>> getActivityByDay() {
        List<Object[]> rows = activityLogRepository.getActivityCountByDay();
        List<Map<String, Object>> result = rows.stream()
                .map(r -> Map.<String, Object>of("day", r[0].toString(), "count", r[1]))
                .toList();
        return ResponseEntity.ok(result);
    }

    private static double growthPercent(long current, long previous) {
        if (previous == 0) return current > 0 ? 100.0 : 0.0;
        return Math.round((current - previous) * 1000.0 / previous) / 10.0;
    }
}
