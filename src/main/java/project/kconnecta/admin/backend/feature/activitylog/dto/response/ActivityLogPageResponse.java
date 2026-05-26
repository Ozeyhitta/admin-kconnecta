package project.kconnecta.admin.backend.feature.activitylog.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class ActivityLogPageResponse {
    List<UserActivityLogResponse> content;
    long totalElements;
    long totalPages;
    int page;
    int size;
}
