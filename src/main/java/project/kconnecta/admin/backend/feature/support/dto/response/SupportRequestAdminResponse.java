package project.kconnecta.admin.backend.feature.support.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.admin.backend.entity.SupportRequest;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class SupportRequestAdminResponse {

    private UUID id;
    private UUID userId;
    private String username;
    private String fullName;
    private String avatarUrl;
    private String contactEmail;
    private String category;
    private String subject;
    private String message;
    private String status;
    private LocalDateTime createdAt;

    public static SupportRequestAdminResponse from(SupportRequest s) {
        var user = s.getUser();
        return SupportRequestAdminResponse.builder()
                .id(s.getId())
                .userId(user != null ? user.getId() : null)
                .username(user != null ? user.getUsername() : null)
                .fullName(user != null ? user.getFullName() : null)
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .contactEmail(s.getContactEmail())
                .category(s.getCategory())
                .subject(s.getSubject())
                .message(s.getMessage())
                .status(s.getStatus())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
