package project.kconnecta.admin.backend.feature.activitylog.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.ActivityLogPageResponse;
import project.kconnecta.admin.backend.feature.activitylog.service.ActivityLogAdminService;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/admin/activity-logs")
@RequiredArgsConstructor
public class ActivityLogAdminController {

    private final ActivityLogAdminService activityLogAdminService;

    @GetMapping
    public ResponseEntity<ActivityLogPageResponse> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        return ResponseEntity.ok(
                activityLogAdminService.getLogs(page, size, sortBy, sortDir, username, actionType, from, to));
    }
}
