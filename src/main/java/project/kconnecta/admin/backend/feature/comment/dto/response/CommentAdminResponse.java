package project.kconnecta.admin.backend.feature.comment.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.admin.backend.entity.PostComment;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class CommentAdminResponse {

    private UUID id;
    private UUID postId;
    private UUID authorId;
    private String authorUsername;
    private String authorFullName;
    private String authorAvatarUrl;
    private UUID parentCommentId;
    private String content;
    private boolean deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CommentAdminResponse from(PostComment c) {
        var user = c.getUser();
        var parent = c.getParentComment();
        return CommentAdminResponse.builder()
                .id(c.getId())
                .postId(c.getPost() != null ? c.getPost().getId() : null)
                .authorId(user != null ? user.getId() : null)
                .authorUsername(user != null ? user.getUsername() : null)
                .authorFullName(user != null ? user.getFullName() : null)
                .authorAvatarUrl(user != null ? user.getAvatarUrl() : null)
                .parentCommentId(parent != null ? parent.getId() : null)
                .content(c.getContent())
                .deleted(c.isDeleted())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
