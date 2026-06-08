package project.kconnecta.admin.backend.feature.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.entity.Post;
import project.kconnecta.admin.backend.entity.PostReport;
import project.kconnecta.admin.backend.entity.User;
import project.kconnecta.admin.backend.feature.notification.dto.response.PostReportNotificationResponse;
import project.kconnecta.admin.backend.feature.report.repository.PostReportAdminRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PostReportNotificationService {

    private final PostReportAdminRepository postReportAdminRepository;

    @Transactional(readOnly = true)
    public List<PostReportNotificationResponse> listRecent(int size) {
        int limit = Math.max(1, Math.min(size, 50));
        var pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        return postReportAdminRepository.findAllFiltered(null, null, pageable)
                .map(this::toResponse)
                .getContent();
    }

    @Transactional(readOnly = true)
    public long countAll() {
        return postReportAdminRepository.count();
    }

    private PostReportNotificationResponse toResponse(PostReport report) {
        Post post = report.getPost();
        User reporter = report.getReporter();
        User author = post != null ? post.getAuthor() : null;
        String reason = report.getReason() != null ? report.getReason().trim() : "";

        return PostReportNotificationResponse.builder()
                .id(report.getId())
                .postId(post != null ? post.getId() : null)
                .reporterId(reporter != null ? reporter.getId() : null)
                .reporterUsername(reporter != null ? reporter.getUsername() : null)
                .reporterFullName(reporter != null ? reporter.getFullName() : null)
                .reporterAvatarUrl(reporter != null ? reporter.getAvatarUrl() : null)
                .postAuthorFullName(author != null ? author.getFullName() : null)
                .reason(reason)
                .summary(buildSummary(reason, reporter, author))
                .createdAt(report.getCreatedAt())
                .build();
    }

    private String buildSummary(String reason, User reporter, User author) {
        String reporterName = reporter != null
                ? (reporter.getFullName() != null && !reporter.getFullName().isBlank()
                ? reporter.getFullName()
                : reporter.getUsername())
                : "Người dùng";
        String authorName = author != null && author.getFullName() != null && !author.getFullName().isBlank()
                ? author.getFullName()
                : "tác giả";

        if (reason.contains("watch")) {
            return reporterName + " báo cáo video của " + authorName + ".";
        }
        if (reason.contains("post-menu")) {
            return reporterName + " báo cáo bài viết của " + authorName + ".";
        }
        return reporterName + " báo cáo nội dung của " + authorName + ".";
    }
}
