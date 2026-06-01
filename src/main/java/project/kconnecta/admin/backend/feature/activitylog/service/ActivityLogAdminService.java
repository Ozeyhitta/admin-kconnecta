package project.kconnecta.admin.backend.feature.activitylog.service;

import project.kconnecta.admin.backend.feature.activitylog.dto.response.ActivityLogPageResponse;

import java.time.LocalDateTime;
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
