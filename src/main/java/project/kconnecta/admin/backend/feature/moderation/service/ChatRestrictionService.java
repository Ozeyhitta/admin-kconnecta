package project.kconnecta.admin.backend.feature.moderation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.feature.moderation.entity.ChatRestriction;
import project.kconnecta.admin.backend.feature.moderation.repository.ChatRestrictionRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatRestrictionService {

    private final ChatRestrictionRepository chatRestrictionRepository;

    @Transactional
    public ChatRestriction restrict(UUID userId, int durationHours, String reason, String createdByAdmin) {
        Optional<ChatRestriction> existing = chatRestrictionRepository.findByUserId(userId);
        LocalDateTime restrictedUntil = LocalDateTime.now().plusHours(durationHours);

        if (existing.isPresent()) {
            ChatRestriction restriction = existing.get();
            restriction.setRestrictedUntil(restrictedUntil);
            restriction.setReason(reason);
            restriction.setCreatedByAdmin(createdByAdmin);
            return chatRestrictionRepository.save(restriction);
        }

        ChatRestriction restriction = ChatRestriction.builder()
                .userId(userId)
                .restrictedUntil(restrictedUntil)
                .reason(reason)
                .createdByAdmin(createdByAdmin)
                .build();
        return chatRestrictionRepository.save(restriction);
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
