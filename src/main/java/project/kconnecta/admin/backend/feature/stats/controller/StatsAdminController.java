package project.kconnecta.admin.backend.feature.stats.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.admin.backend.feature.stats.dto.response.DauMauResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.DayCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.EngagementAnalyticsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.HourCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.NewUsersAnalyticsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.OnlineUsersResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.OverviewStatsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.PeriodCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.SystemOverviewResponse;
import project.kconnecta.admin.backend.feature.stats.service.StatsAdminService;

import java.util.List;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/admin/stats")
@RequiredArgsConstructor
public class StatsAdminController {

    private final StatsAdminService statsAdminService;

    @GetMapping("/system-overview")
    public ResponseEntity<SystemOverviewResponse> getSystemOverview() {
        return ResponseEntity.ok(statsAdminService.getSystemOverview());
    }

    @GetMapping("/overview")
    public ResponseEntity<OverviewStatsResponse> getOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "previous_period") String compareMode) {
        return ResponseEntity.ok(statsAdminService.getOverview(from, to, compareMode));
    }

    @GetMapping("/online")
    public ResponseEntity<OnlineUsersResponse> getOnlineUsers() {
        return ResponseEntity.ok(statsAdminService.getOnlineUsers());
    }

    @GetMapping("/new-users")
    public ResponseEntity<List<PeriodCountResponse>> getNewUsers(
            @RequestParam(defaultValue = "day") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(statsAdminService.getNewUsers(period, from, to));
    }

    @GetMapping("/dau-mau")
    public ResponseEntity<DauMauResponse> getDauMau(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(statsAdminService.getDauMau(from, to));
    }

    @GetMapping("/interactions")
    public ResponseEntity<List<PeriodCountResponse>> getInteractions(
            @RequestParam(defaultValue = "day") String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(statsAdminService.getInteractions(period, from, to));
    }

    @GetMapping("/activity-by-hour")
    public ResponseEntity<List<HourCountResponse>> getActivityByHour(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(statsAdminService.getActivityByHour(from, to));
    }

    @GetMapping("/new-users-analytics")
    public ResponseEntity<NewUsersAnalyticsResponse> getNewUsersAnalytics(
            @RequestParam(defaultValue = "day") String groupBy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(statsAdminService.getNewUsersAnalytics(groupBy, from, to));
    }

    @GetMapping("/activity-by-day")
    public ResponseEntity<List<DayCountResponse>> getActivityByDay(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(statsAdminService.getActivityByDay(from, to));
    }

    /** DAU/MAU + interaction analytics with insights and alerts for the stats dashboard. */
    @GetMapping("/engagement-analytics")
    public ResponseEntity<EngagementAnalyticsResponse> getEngagementAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(statsAdminService.getEngagementAnalytics(from, to));
    }
}
