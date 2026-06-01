package project.kconnecta.admin.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Read-only mapping of {@code user_activity_logs} (written by User backend).
 * Hibernate {@code ddl-auto: update} will add new columns when User service deploys.
 */
@Entity
@Table(name = "user_activity_logs", schema = "public")
@Getter
@NoArgsConstructor
public class UserActivityLog {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "username", length = 30)
    private String username;

    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType;

    @Column(name = "action_label", length = 100)
    private String actionLabel;

    @Column(name = "target_type", length = 50)
    private String targetType;

    @Column(name = "target_id")
    private UUID targetId;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "severity", length = 20)
    private String severity;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "device_type", length = 30)
    private String deviceType;

    @Column(name = "browser", length = 50)
    private String browser;

    @Column(name = "os", length = 50)
    private String os;

    @Column(name = "location", length = 120)
    private String location;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
