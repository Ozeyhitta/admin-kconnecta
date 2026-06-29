package project.kconnecta.admin.backend.feature.stats.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class OnlineUsersDetailResponse {
    long online;
    int windowMinutes;
    LocalDateTime updatedAt;
    List<OnlineUserItemResponse> users;
}
