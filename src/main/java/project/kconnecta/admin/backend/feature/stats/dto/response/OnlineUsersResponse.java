package project.kconnecta.admin.backend.feature.stats.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class OnlineUsersResponse {
    long online;
    LocalDateTime updatedAt;
}
