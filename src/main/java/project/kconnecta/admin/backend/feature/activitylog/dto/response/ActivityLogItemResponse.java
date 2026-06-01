package project.kconnecta.admin.backend.feature.activitylog.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class ActivityLogItemResponse {
    UUID id;
    UUID userId;
    String username;
    String fullName;
    String avatarUrl;
    String actionType;
    String actionLabel;
    String targetType;
    UUID targetId;
    /** SUCCESS | FAILED | BLOCKED */
    String status;
    /** INFO | WARNING | HIGH */
    String severity;
    String description;
    String ipAddress;
    String userAgent;
    String deviceType;
    String browser;
    String os;
    String location;
    String metadata;
    LocalDateTime createdAt;
    boolean abnormal;
    String abnormalReason;
}
