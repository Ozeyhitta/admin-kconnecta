package project.kconnecta.admin.backend.feature.activitylog.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ActivityLogPageResponse {
    List<ActivityLogItemResponse> items;
    ActivityLogPaginationResponse pagination;
    ActivityLogSummaryResponse summary;

    /** Backward-compatible alias for ra-core data provider. */
    List<ActivityLogItemResponse> content;
    long totalElements;
    long totalPages;
    int page;
    int size;
}
