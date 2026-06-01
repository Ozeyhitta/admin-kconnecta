package project.kconnecta.admin.backend.feature.stats.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AnalyticsChartPoint {
    String date;
    String label;
    long count;
}
