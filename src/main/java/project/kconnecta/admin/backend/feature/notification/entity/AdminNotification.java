package project.kconnecta.admin.backend.feature.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.admin.backend.common.enums.NotificationType;
import project.kconnecta.admin.backend.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminNotification {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(name = "sender_id")
    private UUID senderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "related_id")
    private UUID relatedId;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @Column(name = "is_actioned", nullable = false)
    private boolean isActioned;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
}
