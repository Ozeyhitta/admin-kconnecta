package project.kconnecta.admin.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.admin.backend.common.enums.PostPrivacy;
import project.kconnecta.admin.backend.common.enums.PostStatus;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "posts", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PostPrivacy privacy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostStatus status;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "location_text", length = 255)
    private String locationText;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "is_promoted", nullable = false)
    private boolean promoted;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
