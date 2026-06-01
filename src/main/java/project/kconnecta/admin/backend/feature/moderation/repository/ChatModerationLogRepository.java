package project.kconnecta.admin.backend.feature.moderation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.feature.moderation.entity.ChatModerationLog;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface ChatModerationLogRepository extends JpaRepository<ChatModerationLog, UUID> {

    long countByUserIdAndCreatedAtAfter(UUID userId, LocalDateTime createdAt);
}
