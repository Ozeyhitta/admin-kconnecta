package project.kconnecta.admin.backend.feature.live.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.admin.backend.entity.LiveSession;

import java.util.Optional;
import java.util.UUID;

public interface LiveSessionAdminRepository extends JpaRepository<LiveSession, UUID> {

    /** The most recent livestream session attached to a given post, if any. */
    Optional<LiveSession> findFirstByPostIdOrderByCreatedAtDesc(UUID postId);
}
