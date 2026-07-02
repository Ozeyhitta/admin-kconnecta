package project.kconnecta.admin.backend.feature.conversation.service;

import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminChatAuditLogResponse;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationDetailResponse;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationPageResponse;

import java.util.List;

public interface ConversationAdminService {

    AdminConversationPageResponse getPrivateConversations(
            int page,
            int size,
            String sortBy,
            String sortDir,
            String searchQuery
    );

    AdminConversationDetailResponse getPrivateConversation(String id);

    void deleteConversation(String id);

    void deleteMessage(String messageId);

    void updateConversationStatus(String id, String status, String reason, String adminUsername);

    void updateMessageStatus(String conversationId, String messageId, String status, String reason, String adminUsername);

    List<AdminChatAuditLogResponse> getAuditLogs(String conversationId);
}

