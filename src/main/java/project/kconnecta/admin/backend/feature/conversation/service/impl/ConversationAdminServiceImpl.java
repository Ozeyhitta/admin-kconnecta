package project.kconnecta.admin.backend.feature.conversation.service.impl;

import project.kconnecta.admin.backend.feature.conversation.service.ConversationAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationDetailResponse;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationPageResponse;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationSummaryResponse;
import project.kconnecta.admin.backend.feature.conversation.repository.ConversationAdminRepository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConversationAdminServiceImpl implements ConversationAdminService {

    private static final Set<String> VALID_SORT_FIELDS = Set.of("lastMessageAt", "messageCount", "unreadCount");
    private static final int DEFAULT_MESSAGE_LIMIT = 100;

    private final ConversationAdminRepository conversationAdminRepository;

    @Override
    public AdminConversationPageResponse getPrivateConversations(
            int page,
            int size,
            String sortBy,
            String sortDir,
            String searchQuery
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        String safeSort = VALID_SORT_FIELDS.contains(sortBy) ? sortBy : "lastMessageAt";
        String direction = "asc".equalsIgnoreCase(sortDir) ? "ASC" : "DESC";

        List<AdminConversationSummaryResponse> content = conversationAdminRepository.findSummaries(
                searchQuery,
                sortColumn(safeSort),
                direction,
                safeSize,
                safePage * safeSize
        );

        long total = conversationAdminRepository.countSummaries(searchQuery);

        return AdminConversationPageResponse.builder()
                .content(content)
                .totalElements(total)
                .totalPages((long) Math.ceil((double) total / safeSize))
                .page(safePage)
                .size(safeSize)
                .build();
    }

    @Override
    public AdminConversationDetailResponse getPrivateConversation(String id) {
        UUID[] pair = parsePairId(id);
        AdminConversationSummaryResponse summary = conversationAdminRepository
                .findSummaryByUserPair(pair[0], pair[1])
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        return AdminConversationDetailResponse.builder()
                .id(id)
                .summary(summary)
                .messages(conversationAdminRepository.findMessagesByUserPair(pair[0], pair[1], DEFAULT_MESSAGE_LIMIT))
                .build();
    }

    @Override
    public void deleteConversation(String id) {
        UUID[] pair = parsePairId(id);
        int updated = conversationAdminRepository.deleteConversation(pair[0], pair[1]);
        if (updated == 0) {
            throw new ResourceNotFoundException("Conversation not found or already deleted");
        }
    }

    @Override
    public void deleteMessage(String messageId) {
        UUID msgId;
        try {
            msgId = UUID.fromString(messageId);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid message ID format");
        }
        int updated = conversationAdminRepository.deleteMessage(msgId);
        if (updated == 0) {
            throw new ResourceNotFoundException("Message not found or already deleted");
        }
    }

    private String sortColumn(String sortBy) {
        return switch (sortBy) {
            case "messageCount" -> "message_count";
            case "unreadCount" -> "unread_count";
            default -> "last_message_at";
        };
    }

    private UUID[] parsePairId(String id) {
        String[] parts = id.split("_", 2);
        if (parts.length != 2) {
            throw new ResourceNotFoundException("Conversation not found");
        }
        return new UUID[]{UUID.fromString(parts[0]), UUID.fromString(parts[1])};
    }
}

