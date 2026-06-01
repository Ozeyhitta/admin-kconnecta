package project.kconnecta.admin.backend.feature.moderation.dto;

import lombok.Builder;
import lombok.Value;
import project.kconnecta.admin.backend.common.enums.AlertSeverity;
import project.kconnecta.admin.backend.common.enums.AlertType;

import java.util.UUID;

@Value
@Builder
public class ViolationResult {
    UUID userId;
    UUID messageId;
    String conversationId;
    AlertType alertType;
    AlertSeverity severity;
    String messagePreview;
    String messageHash;
    String actionTaken;
    Integer retryAfterSeconds;
    String alertTitle;
    String alertDescription;
}
