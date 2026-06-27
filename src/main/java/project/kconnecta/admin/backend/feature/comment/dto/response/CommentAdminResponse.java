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
    private String status;
    private String moderationFailReason;
    private UUID moderationLockedBy;
    private String moderationLockedByUsername;
    private LocalDateTime moderationLockedAt;
    private boolean moderationLockedByMe;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CommentAdminResponse from(PostComment c) {
        return from(c, null, null, false);
    }

    public static CommentAdminResponse from(
            PostComment c,
            UUID viewerAdminId,
            java.util.Map<UUID, String> lockerUsernames,
            boolean lockActive) {
        var user = c.getUser();
        var parent = c.getParentComment();
        UUID lockedBy = lockActive ? c.getModerationLockedBy() : null;
        String lockerUsername = lockedBy != null && lockerUsernames != null
                ? lockerUsernames.get(lockedBy)
                : null;
        boolean lockedByMe = lockActive && viewerAdminId != null && lockedBy != null && lockedBy.equals(viewerAdminId);
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
                .status(c.getStatus())
                .moderationFailReason(c.getModerationFailReason())
                .moderationLockedBy(lockedBy)
                .moderationLockedByUsername(lockerUsername)
                .moderationLockedAt(lockActive ? c.getModerationLockedAt() : null)
                .moderationLockedByMe(lockedByMe)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
