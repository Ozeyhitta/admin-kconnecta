package project.kconnecta.admin.backend.feature.moderation.dto.response;

import lombok.Builder;
import lombok.Value;
import project.kconnecta.admin.backend.common.enums.AlertSeverity;
import project.kconnecta.admin.backend.common.enums.AlertStatus;
import project.kconnecta.admin.backend.common.enums.AlertType;
import project.kconnecta.admin.backend.feature.moderation.entity.AdminAlert;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class AdminAlertResponse {
    UUID id;
    AlertType type;
    AlertSeverity severity;
    UUID userId;
    String conversationId;
    UUID messageId;
    String title;
    String description;
    AlertStatus status;
    LocalDateTime createdAt;
    LocalDateTime resolvedAt;
    String resolvedBy;

    public static AdminAlertResponse from(AdminAlert alert) {
        return AdminAlertResponse.builder()
                .id(alert.getId())
                .type(alert.getType())
                .severity(alert.getSeverity())
                .userId(alert.getUserId())
                .conversationId(alert.getConversationId())
                .messageId(alert.getMessageId())
                .title(alert.getTitle())
                .description(alert.getDescription())
                .status(alert.getStatus())
                .createdAt(alert.getCreatedAt())
                .resolvedAt(alert.getResolvedAt())
                .resolvedBy(alert.getResolvedBy())
                .build();
    }
}
