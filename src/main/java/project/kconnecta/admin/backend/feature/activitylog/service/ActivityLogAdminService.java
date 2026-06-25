package project.kconnecta.admin.backend.feature.activitylog.service;

import project.kconnecta.admin.backend.feature.activitylog.dto.response.ActivityLogItemResponse;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.ActivityLogPageResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ActivityLogAdminService {

    ActivityLogPageResponse getLogs(
            int page,
            int size,
            String sortBy,
            String sortDir,
            UUID userId,
            String username,
            String actionType,
            String status,
            String severity,
            LocalDateTime from,
            LocalDateTime to,
            boolean abnormalOnly
    );

    List<ActivityLogItemResponse> getRecentInteractionLogs(
            LocalDateTime from,
            LocalDateTime to,
            String actionType,
            int limit
    );

    String exportCsv(
            UUID userId,
            String username,
            String actionType,
            String status,
            String severity,
            LocalDateTime from,
            LocalDateTime to,
            boolean abnormalOnly
    );
}
