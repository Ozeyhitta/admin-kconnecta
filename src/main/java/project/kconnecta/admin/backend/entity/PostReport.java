package project.kconnecta.admin.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "post_reports",
        schema = "public",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_post_report_post_reporter",
                columnNames = {"post_id", "reporter_id"}
        ),
        indexes = {
                @Index(name = "idx_post_report_post", columnList = "post_id"),
                @Index(name = "idx_post_report_reporter", columnList = "reporter_id"),
                @Index(name = "idx_post_report_created_at", columnList = "created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostReport {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
