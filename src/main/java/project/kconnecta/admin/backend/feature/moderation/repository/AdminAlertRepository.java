package project.kconnecta.admin.backend.feature.moderation.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.common.enums.AlertStatus;
import project.kconnecta.admin.backend.common.enums.AlertType;
import project.kconnecta.admin.backend.feature.moderation.entity.AdminAlert;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface AdminAlertRepository extends JpaRepository<AdminAlert, UUID> {

    Page<AdminAlert> findByStatus(AlertStatus status, Pageable pageable);

    Page<AdminAlert> findByStatusAndType(AlertStatus status, AlertType type, Pageable pageable);

    Page<AdminAlert> findByType(AlertType type, Pageable pageable);

    boolean existsByUserIdAndTypeAndCreatedAtAfter(UUID userId, AlertType type, LocalDateTime createdAt);

    long countByStatusAndType(AlertStatus status, AlertType type);
}
