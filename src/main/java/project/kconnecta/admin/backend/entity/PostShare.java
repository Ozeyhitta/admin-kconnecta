package project.kconnecta.admin.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Read-only mapping of {@code post_shares} (written by the User backend).
 * A share is a user re-posting an original {@link Post} with an optional caption.
 * Distinct from the {@code posts} table — the admin feed merges the two.
 */
@Entity
@Table(name = "post_shares", schema = "public")
@Getter
@Setter
@NoArgsConstructor
public class PostShare {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    /** The original post being shared. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    /** The user who shared the post. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User sharer;

    @Column(name = "parent_share_id")
    private UUID parentShareId;

    @Column(name = "shared_content", columnDefinition = "TEXT")
    private String sharedContent;

    @Column(name = "privacy", length = 20)
    private String privacy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
