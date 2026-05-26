package project.kconnecta.admin.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.admin.backend.common.enums.PostPrivacy;
import project.kconnecta.admin.backend.common.enums.PostStatus;
import project.kconnecta.admin.backend.entity.Post;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class PostAdminResponse {

    private UUID id;
    private UUID authorId;
    private String authorUsername;
    private String authorFullName;
    private String authorAvatarUrl;
    private String content;
    private PostPrivacy privacy;
    private PostStatus status;
    private String imageUrl;
    private String locationText;
    private boolean promoted;
    private LocalDateTime scheduledAt;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PostAdminResponse from(Post post) {
        var author = post.getAuthor();
        return PostAdminResponse.builder()
                .id(post.getId())
                .authorId(author != null ? author.getId() : null)
                .authorUsername(author != null ? author.getUsername() : null)
                .authorFullName(author != null ? author.getFullName() : null)
                .authorAvatarUrl(author != null ? author.getAvatarUrl() : null)
                .content(post.getContent())
                .privacy(post.getPrivacy())
                .status(post.getStatus())
                .imageUrl(post.getImageUrl())
                .locationText(post.getLocationText())
                .promoted(post.isPromoted())
                .scheduledAt(post.getScheduledAt())
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }
}
