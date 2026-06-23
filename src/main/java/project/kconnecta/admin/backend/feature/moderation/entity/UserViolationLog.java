package project.kconnecta.admin.backend.feature.moderation.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.admin.backend.common.enums.AlertSeverity;
import project.kconnecta.admin.backend.common.enums.AlertType;
import project.kconnecta.admin.backend.common.enums.ViolationSource;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_violation_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserViolationLog {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ViolationSource source;

    /** Id of the offending post or comment — used to deduplicate repeated actions on the same content. */
    @Column(name = "ref_id")
    private UUID refId;

    @Enumerated(EnumType.STRING)
    @Column(name = "violation_type", nullable = false, length = 50)
    private AlertType violationType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlertSeverity severity;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
