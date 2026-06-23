package project.kconnecta.admin.backend.feature.moderation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.common.enums.ViolationSource;
import project.kconnecta.admin.backend.feature.moderation.entity.UserViolationLog;

import java.util.UUID;

@Repository
public interface UserViolationLogRepository extends JpaRepository<UserViolationLog, UUID> {

    long countByUserId(UUID userId);

    boolean existsBySourceAndRefId(ViolationSource source, UUID refId);
}
