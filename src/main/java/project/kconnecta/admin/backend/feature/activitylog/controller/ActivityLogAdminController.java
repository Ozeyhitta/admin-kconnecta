package project.kconnecta.admin.backend.feature.activitylog.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.ActivityLogPageResponse;
import project.kconnecta.admin.backend.feature.activitylog.service.ActivityLogAdminService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

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
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDateTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDateTime,
            @RequestParam(defaultValue = "false") boolean abnormalOnly
    ) {
        LocalDateTime fromDt = fromDateTime != null ? fromDateTime
                : from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = toDateTime != null ? toDateTime
                : to != null ? to.atTime(LocalTime.MAX) : null;

        return ResponseEntity.ok(activityLogAdminService.getLogs(
                page, size, sortBy, sortDir,
                userId, username, actionType, status, severity,
                fromDt, toDt, abnormalOnly));
    }

    @GetMapping("/export")
    public ResponseEntity<String> exportCsv(
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "false") boolean abnormalOnly
    ) {
        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.atTime(LocalTime.MAX) : null;
        String csv = activityLogAdminService.exportCsv(
                userId, username, actionType, status, severity, fromDt, toDt, abnormalOnly);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=activity-logs.csv")
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
