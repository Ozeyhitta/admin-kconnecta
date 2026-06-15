package project.kconnecta.admin.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "post_comments", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostComment {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private PostComment parentComment;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // Trạng thái kiểm duyệt (APPROVED/PENDING/REJECTED) — map cột do user backend ghi.
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "moderation_fail_reason", columnDefinition = "TEXT")
    private String moderationFailReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
