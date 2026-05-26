package project.kconnecta.admin.backend.feature.activitylog.dto.response;

import lombok.Builder;
import lombok.Value;
import project.kconnecta.admin.backend.entity.UserActivityLog;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class UserActivityLogResponse {

    UUID id;
    UUID userId;
    String username;
    String actionType;
    String metadata;
    LocalDateTime createdAt;

    public static UserActivityLogResponse from(UserActivityLog log) {
        return UserActivityLogResponse.builder()
                .id(log.getId())
                .userId(log.getUserId())
                .username(log.getUsername())
                .actionType(log.getActionType())
                .metadata(log.getMetadata())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
