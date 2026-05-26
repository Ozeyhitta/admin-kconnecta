package project.kconnecta.admin.backend.feature.report.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.admin.backend.entity.Post;
import project.kconnecta.admin.backend.entity.PostReport;
import project.kconnecta.admin.backend.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class PostReportAdminResponse {
    private UUID id;
    private UUID postId;
    private String postContent;
    private UUID postAuthorId;
    private String postAuthorUsername;
    private String postAuthorFullName;
    private String postAuthorAvatarUrl;
    private UUID reporterId;
    private String reporterUsername;
    private String reporterFullName;
    private String reporterAvatarUrl;
    private String reason;
    private LocalDateTime createdAt;

    public static PostReportAdminResponse from(PostReport report) {
        Post post = report.getPost();
        User postAuthor = post != null ? post.getAuthor() : null;
        User reporter = report.getReporter();

        return PostReportAdminResponse.builder()
                .id(report.getId())
                .postId(post != null ? post.getId() : null)
                .postContent(post != null ? post.getContent() : null)
                .postAuthorId(postAuthor != null ? postAuthor.getId() : null)
                .postAuthorUsername(postAuthor != null ? postAuthor.getUsername() : null)
                .postAuthorFullName(postAuthor != null ? postAuthor.getFullName() : null)
                .postAuthorAvatarUrl(postAuthor != null ? postAuthor.getAvatarUrl() : null)
                .reporterId(reporter != null ? reporter.getId() : null)
                .reporterUsername(reporter != null ? reporter.getUsername() : null)
                .reporterFullName(reporter != null ? reporter.getFullName() : null)
                .reporterAvatarUrl(reporter != null ? reporter.getAvatarUrl() : null)
                .reason(report.getReason())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
