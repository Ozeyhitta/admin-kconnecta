package project.kconnecta.admin.backend.feature.conversation.service;

import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationDetailResponse;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationPageResponse;

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
}

