package project.kconnecta.admin.backend.feature.stats.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.feature.activitylog.repository.UserActivityLogRepository;
import project.kconnecta.admin.backend.feature.stats.dto.OverviewStatsResponse;
import project.kconnecta.admin.backend.feature.user.repository.AccountRepository;

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

    @GetMapping("/overview")
    public ResponseEntity<OverviewStatsResponse> getOverview() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);
        LocalDateTime sevenDaysAgo = todayStart.minusDays(7);
        LocalDateTime thirtyDaysAgo = todayStart.minusDays(30);

        OverviewStatsResponse stats = OverviewStatsResponse.builder()
                // Users
                .totalUsers(accountRepository.count())
                .activeUsers(accountRepository.countByStatus(AccountStatus.ACTIVE))
                .inactiveUsers(accountRepository.countByStatus(AccountStatus.INACTIVE))
                .newUsersLast30Days(accountRepository.countByCreatedAtBetween(thirtyDaysAgo, todayEnd))
                // Activity totals
                .activityToday(activityLogRepository.countByCreatedAtBetween(todayStart, todayEnd))
                .activityLast7Days(activityLogRepository.countByCreatedAtBetween(sevenDaysAgo, todayEnd))
                // Per-type today
                .loginsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween("LOGIN", todayStart, todayEnd))
                .postsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween("POST_CREATED", todayStart, todayEnd))
                .commentsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween("COMMENT_ADDED", todayStart, todayEnd))
                .sharesToday(activityLogRepository.countByActionTypeAndCreatedAtBetween("POST_SHARED", todayStart, todayEnd))
                .reactionsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween("REACTION_ADDED", todayStart, todayEnd))
                .friendRequestsToday(activityLogRepository.countByActionTypeAndCreatedAtBetween("FRIEND_REQUEST_SENT", todayStart, todayEnd))
                .build();

        return ResponseEntity.ok(stats);
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
}
