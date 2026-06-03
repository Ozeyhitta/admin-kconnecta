package project.kconnecta.admin.backend.feature.moderation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.feature.moderation.entity.ModerationConfig;

@Repository
public interface ModerationConfigRepository extends JpaRepository<ModerationConfig, String> {
}
