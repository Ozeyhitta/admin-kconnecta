package project.kconnecta.admin.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.admin.backend.entity.PostShare;
import project.kconnecta.admin.backend.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Detail of a single share: the share itself (who shared, caption, when) plus the
 * full original post so the admin can inspect both from one screen.
 */
@Getter
@Builder
public class PostShareDetailResponse {

    /** Composite id, {@code share:<uuid>}, matching the feed row id. */
    private String id;
    private UUID shareId;
    private UUID sharerId;
    private UUID sharerAccountId;
    private String sharerUsername;
    private String sharerFullName;
    private String sharerAvatarUrl;
    private String sharedContent;
    private String privacy;
    private LocalDateTime createdAt;

    /** The original post, with its own status/report figures. */
    private PostAdminResponse original;

    public static PostShareDetailResponse from(PostShare share, PostAdminResponse original) {
        User sharer = share.getSharer();
        return PostShareDetailResponse.builder()
                .id(PostAdminResponse.SHARE_ID_PREFIX + share.getId())
                .shareId(share.getId())
                .sharerId(sharer != null ? sharer.getId() : null)
                .sharerAccountId(sharer != null && sharer.getAccount() != null
                        ? sharer.getAccount().getId()
                        : null)
                .sharerUsername(sharer != null ? sharer.getUsername() : null)
                .sharerFullName(sharer != null ? sharer.getFullName() : null)
                .sharerAvatarUrl(sharer != null ? sharer.getAvatarUrl() : null)
                .sharedContent(share.getSharedContent())
                .privacy(share.getPrivacy())
                .createdAt(share.getCreatedAt())
                .original(original)
                .build();
    }
}
