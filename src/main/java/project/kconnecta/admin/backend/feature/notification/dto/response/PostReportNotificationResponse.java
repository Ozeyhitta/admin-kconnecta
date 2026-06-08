package project.kconnecta.admin.backend.feature.notification.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class PostReportNotificationResponse {
    UUID id;
    UUID postId;
    UUID reporterId;
    String reporterUsername;
    String reporterFullName;
    String reporterAvatarUrl;
    String postAuthorFullName;
    String reason;
    String summary;
    LocalDateTime createdAt;
}
