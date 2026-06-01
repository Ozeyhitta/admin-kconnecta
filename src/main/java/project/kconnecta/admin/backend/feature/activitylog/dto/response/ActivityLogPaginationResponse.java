package project.kconnecta.admin.backend.feature.activitylog.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ActivityLogPaginationResponse {
    int page;
    int size;
    long totalElements;
    long totalPages;
}
