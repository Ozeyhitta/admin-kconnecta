package project.kconnecta.admin.backend.feature.conversation.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class AdminConversationSummaryResponse {
    String id;
    UUID user1Id;
    String user1Username;
    String user1FullName;
    String user1AvatarUrl;
    UUID user2Id;
    String user2Username;
    String user2FullName;
    String user2AvatarUrl;
    long messageCount;
    long unreadCount;
    String lastMessageContent;
    UUID lastMessageSenderId;
    LocalDateTime lastMessageAt;
    String status;
}

