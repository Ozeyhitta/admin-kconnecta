package project.kconnecta.admin.backend.feature.moderation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.feature.moderation.entity.ChatRestriction;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatRestrictionRepository extends JpaRepository<ChatRestriction, UUID> {

    Optional<ChatRestriction> findByUserId(UUID userId);
}
