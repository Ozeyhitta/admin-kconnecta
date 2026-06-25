package project.kconnecta.admin.backend.feature.stats.dto.response;

import lombok.Builder;
import lombok.Value;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.ActivityLogItemResponse;

import java.util.List;

@Value
@Builder
public class InteractionDetailResponse {
    String mode;
    String title;
    long totalCount;
    List<InteractionBreakdownItem> breakdown;
    List<AnalyticsChartPoint> chartData;
    List<ActivityLogItemResponse> recentLogs;
}
