package project.kconnecta.admin.backend.feature.activitylog.service;

import project.kconnecta.admin.backend.feature.activitylog.dto.response.ActivityLogPageResponse;

import java.time.LocalDateTime;

public interface ActivityLogAdminService {

    ActivityLogPageResponse getLogs(
            int page,
            int size,
            String sortBy,
            String sortDir,
            String username,
            String actionType,
            LocalDateTime from,
            LocalDateTime to
    );
}
