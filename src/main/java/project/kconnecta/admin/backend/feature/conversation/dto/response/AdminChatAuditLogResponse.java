package project.kconnecta.admin.backend.feature.conversation.dto.response;

import lombok.Builder;
import lombok.Value;
import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class AdminChatAuditLogResponse {
    UUID id;
    String adminId;
    String action;
    String conversationId;
    String messageId;
    String targetUserId;
    String reason;
    LocalDateTime createdAt;
}
