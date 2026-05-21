package project.kconnecta.admin.backend.feature.notification.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.admin.backend.feature.notification.entity.AdminNotification;

import java.util.UUID;

public interface AdminNotificationRepository extends JpaRepository<AdminNotification, UUID> {

    @Modifying
    @Query(
        value = "INSERT INTO notifications (id, recipient_id, sender_id, type, content, related_id, is_read, is_actioned, created_at, updated_at) " +
                "SELECT gen_random_uuid(), u.id, NULL, :type, :content, NULL, false, false, NOW(), NOW() FROM users u",
        nativeQuery = true
    )
    int broadcastToAll(@Param("content") String content, @Param("type") String type);
}
