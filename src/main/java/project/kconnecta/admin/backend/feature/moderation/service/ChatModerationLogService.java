package project.kconnecta.admin.backend.feature.moderation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.feature.moderation.dto.ViolationResult;
import project.kconnecta.admin.backend.feature.moderation.entity.ChatModerationLog;
import project.kconnecta.admin.backend.feature.moderation.repository.ChatModerationLogRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatModerationLogService {

    private final ChatModerationLogRepository chatModerationLogRepository;

    @Transactional
    public void log(ViolationResult violation) {
        ChatModerationLog entry = ChatModerationLog.builder()
                .userId(violation.getUserId())
                .conversationId(violation.getConversationId())
                .messageId(violation.getMessageId())
                .violationType(violation.getAlertType())
                .messagePreview(violation.getMessagePreview())
                .messageHash(violation.getMessageHash())
                .severity(violation.getSeverity())
                .actionTaken(violation.getActionTaken())
                .retryAfterSeconds(violation.getRetryAfterSeconds())
                .build();
        chatModerationLogRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public long countViolationsForUserLast24h(UUID userId) {
        LocalDateTime since = LocalDateTime.now().minusHours(24);
        return chatModerationLogRepository.countByUserIdAndCreatedAtAfter(userId, since);
    }
}
