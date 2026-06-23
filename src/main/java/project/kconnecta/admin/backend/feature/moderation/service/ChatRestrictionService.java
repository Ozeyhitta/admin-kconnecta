package project.kconnecta.admin.backend.feature.moderation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.feature.activitylog.service.ActivityLogWriterService;
import project.kconnecta.admin.backend.feature.moderation.entity.ChatRestriction;
import project.kconnecta.admin.backend.feature.moderation.repository.ChatRestrictionRepository;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatRestrictionService {

    private final ChatRestrictionRepository chatRestrictionRepository;
    private final ActivityLogWriterService activityLogWriter;
    private final UserRepository userRepository;

    @Transactional
    public ChatRestriction restrict(UUID userId, int durationHours, String reason, String createdByAdmin) {
        Optional<ChatRestriction> existing = chatRestrictionRepository.findByUserId(userId);
        LocalDateTime restrictedUntil = LocalDateTime.now().plusHours(durationHours);

        if (existing.isPresent()) {
            ChatRestriction restriction = existing.get();
            restriction.setRestrictedUntil(restrictedUntil);
            restriction.setReason(reason);
            restriction.setCreatedByAdmin(createdByAdmin);
            ChatRestriction saved = chatRestrictionRepository.save(restriction);
            writeRestrictionLog(userId, durationHours, reason);
            return saved;
        }

        ChatRestriction restriction = ChatRestriction.builder()
                .userId(userId)
                .restrictedUntil(restrictedUntil)
                .reason(reason)
                .createdByAdmin(createdByAdmin)
                .build();
        ChatRestriction saved = chatRestrictionRepository.save(restriction);
        writeRestrictionLog(userId, durationHours, reason);
        return saved;
    }

    private void writeRestrictionLog(UUID userId, int durationHours, String reason) {
        userRepository.findById(userId).ifPresent(user ->
                activityLogWriter.log(
                        user.getId(),
                        user.getUsername(),
                        "CHAT_RESTRICTED",
                        buildRestrictionMetadata(durationHours, reason)
                ));
    }

    private static String buildRestrictionMetadata(int durationHours, String reason) {
        String safeReason = reason != null && !reason.isBlank()
                ? reason.replace("\"", "\\\"")
                : "Admin hạn chế chat";
        return "{\"reason\":\"" + safeReason + "\",\"durationHours\":" + durationHours + "}";
    }

    @Transactional(readOnly = true)
    public boolean isCurrentlyRestricted(UUID userId) {
        return chatRestrictionRepository.findByUserId(userId)
                .map(r -> r.getRestrictedUntil() != null && r.getRestrictedUntil().isAfter(LocalDateTime.now()))
                .orElse(false);
    }

    @Transactional
    public void lift(UUID userId, String liftedBy) {
        chatRestrictionRepository.findByUserId(userId).ifPresent(r -> {
            r.setRestrictedUntil(LocalDateTime.now().minusSeconds(1));
            r.setCreatedByAdmin(liftedBy);
            chatRestrictionRepository.save(r);
        });
    }
}
