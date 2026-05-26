package project.kconnecta.admin.backend.feature.stats.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.admin.backend.feature.stats.dto.response.DauMauResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.DayCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.HourCountResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.OnlineUsersResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.OverviewStatsResponse;
import project.kconnecta.admin.backend.feature.stats.dto.response.PeriodCountResponse;
import project.kconnecta.admin.backend.feature.stats.service.StatsAdminService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/stats")
@RequiredArgsConstructor
public class StatsAdminController {

    private final StatsAdminService statsAdminService;

    @GetMapping("/overview")
    public ResponseEntity<OverviewStatsResponse> getOverview() {
        return ResponseEntity.ok(statsAdminService.getOverview());
    }

    @GetMapping("/online")
    public ResponseEntity<OnlineUsersResponse> getOnlineUsers() {
        return ResponseEntity.ok(statsAdminService.getOnlineUsers());
    }

    @GetMapping("/new-users")
    public ResponseEntity<List<PeriodCountResponse>> getNewUsers(
            @RequestParam(defaultValue = "day") String period) {
        return ResponseEntity.ok(statsAdminService.getNewUsers(period));
    }

    @GetMapping("/dau-mau")
    public ResponseEntity<DauMauResponse> getDauMau() {
        return ResponseEntity.ok(statsAdminService.getDauMau());
    }

    @GetMapping("/interactions")
    public ResponseEntity<List<PeriodCountResponse>> getInteractions(
            @RequestParam(defaultValue = "day") String period) {
        return ResponseEntity.ok(statsAdminService.getInteractions(period));
    }

    @GetMapping("/activity-by-hour")
    public ResponseEntity<List<HourCountResponse>> getActivityByHour() {
        return ResponseEntity.ok(statsAdminService.getActivityByHour());
    }

    @GetMapping("/activity-by-day")
    public ResponseEntity<List<DayCountResponse>> getActivityByDay() {
        return ResponseEntity.ok(statsAdminService.getActivityByDay());
    }
}
