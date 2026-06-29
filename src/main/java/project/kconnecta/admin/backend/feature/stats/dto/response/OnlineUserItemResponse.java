package project.kconnecta.admin.backend.feature.stats.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class OnlineUserItemResponse {
    UUID accountId;
    String username;
    String fullName;
    String avatarUrl;
    LocalDateTime lastActiveAt;
}
