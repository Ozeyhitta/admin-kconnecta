package project.kconnecta.admin.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.admin.backend.common.enums.PostPrivacy;
import project.kconnecta.admin.backend.common.enums.PostStatus;
import project.kconnecta.admin.backend.common.enums.ReportCategory;
import project.kconnecta.admin.backend.entity.Post;
import project.kconnecta.admin.backend.entity.PostShare;
import project.kconnecta.admin.backend.entity.User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Getter
@Builder
public class PostAdminResponse {

    /** Composite row id: a raw UUID for originals, {@code share:<uuid>} for shares. */
    private String id;

    /** "ORIGINAL" or "SHARE". */
    private String kind;

    private UUID authorId;
    private UUID authorAccountId;
    private String authorUsername;
    private String authorFullName;
    private String authorAvatarUrl;
    private String content;
    private PostPrivacy privacy;
    private PostStatus status;
    private String imageUrl;
    private List<PostMediaAdminResponse> media;
    private String locationText;
    private boolean promoted;
    private LocalDateTime scheduledAt;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long reportCount;
    private ReportCategory latestReportCategory;
    private String latestReportReason;

    // --- SHARE rows only (null for originals) ---
    private String sharedContent;
    private String originalPostId;
    private String originalAuthorUsername;
    private String originalAuthorFullName;
    private String originalContent;
    private PostStatus originalStatus;

    public static final String KIND_ORIGINAL = "ORIGINAL";
    public static final String KIND_SHARE = "SHARE";
    public static final String SHARE_ID_PREFIX = "share:";

    public static PostAdminResponse from(Post post) {
        return from(post, 0L, null, null);
    }

    public static PostAdminResponse from(
            Post post,
            long reportCount,
            ReportCategory latestReportCategory,
            String latestReportReason
    ) {
        return from(post, reportCount, latestReportCategory, latestReportReason, List.of());
    }

    public static PostAdminResponse from(
            Post post,
            long reportCount,
            ReportCategory latestReportCategory,
            String latestReportReason,
            List<PostMediaAdminResponse> media
    ) {
        var author = post.getAuthor();
        return PostAdminResponse.builder()
                .id(post.getId().toString())
                .kind(KIND_ORIGINAL)
                .authorId(author != null ? author.getId() : null)
                .authorAccountId(author != null && author.getAccount() != null
                        ? author.getAccount().getId()
                        : null)
                .authorUsername(author != null ? author.getUsername() : null)
                .authorFullName(author != null ? author.getFullName() : null)
                .authorAvatarUrl(author != null ? author.getAvatarUrl() : null)
                .content(post.getContent())
                .privacy(post.getPrivacy())
                .status(post.getStatus())
                .imageUrl(post.getImageUrl())
                .media(media)
                .locationText(post.getLocationText())
                .promoted(post.isPromoted())
                .scheduledAt(post.getScheduledAt())
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .reportCount(reportCount)
                .latestReportCategory(latestReportCategory)
                .latestReportReason(latestReportReason)
                .build();
    }

    /**
     * A share row. Status and report figures are inherited from the original post
     * (a share has no status of its own and is not directly reportable).
     */
    public static PostAdminResponse fromShare(
            PostShare share,
            long reportCount,
            ReportCategory latestReportCategory,
            String latestReportReason,
            List<PostMediaAdminResponse> media
    ) {
        User sharer = share.getSharer();
        Post original = share.getPost();
        User originalAuthor = original != null ? original.getAuthor() : null;
        PostStatus originalStatus = original != null ? original.getStatus() : null;
        return PostAdminResponse.builder()
                .id(SHARE_ID_PREFIX + share.getId())
                .kind(KIND_SHARE)
                .authorId(sharer != null ? sharer.getId() : null)
                .authorAccountId(sharer != null && sharer.getAccount() != null
                        ? sharer.getAccount().getId()
                        : null)
                .authorUsername(sharer != null ? sharer.getUsername() : null)
                .authorFullName(sharer != null ? sharer.getFullName() : null)
                .authorAvatarUrl(sharer != null ? sharer.getAvatarUrl() : null)
                .content(share.getSharedContent())
                .privacy(parsePrivacy(share.getPrivacy()))
                .status(originalStatus)
                .imageUrl(original != null ? original.getImageUrl() : null)
                .media(media)
                .promoted(false)
                .createdAt(share.getCreatedAt())
                .updatedAt(share.getCreatedAt())
                .reportCount(reportCount)
                .latestReportCategory(latestReportCategory)
                .latestReportReason(latestReportReason)
                .sharedContent(share.getSharedContent())
                .originalPostId(original != null ? original.getId().toString() : null)
                .originalAuthorUsername(originalAuthor != null ? originalAuthor.getUsername() : null)
                .originalAuthorFullName(originalAuthor != null ? originalAuthor.getFullName() : null)
                .originalContent(original != null ? original.getContent() : null)
                .originalStatus(originalStatus)
                .build();
    }

    private static PostPrivacy parsePrivacy(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return PostPrivacy.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
