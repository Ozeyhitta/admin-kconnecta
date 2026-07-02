package project.kconnecta.admin.backend.feature.conversation.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class AdminChatMessageResponse {
    UUID id;
    UUID senderId;
    String senderUsername;
    String senderFullName;
    String senderAvatarUrl;
    UUID receiverId;
    String receiverUsername;
    String receiverFullName;
    String receiverAvatarUrl;
    String content;
    LocalDateTime createdAt;
    boolean delivered;
    boolean seen;
    boolean deleted;
    String status;
}

