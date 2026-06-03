package project.kconnecta.admin.backend.feature.notification.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class AccountReviewRequestResponse {
    UUID id;
    UUID userId;
    String username;
    String fullName;
    String avatarUrl;
    String description;
    LocalDateTime createdAt;
}
