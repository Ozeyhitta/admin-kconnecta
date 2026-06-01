package project.kconnecta.admin.backend.feature.stats.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class NewUsersAnalyticsResponse {
    NewUsersSummary summary;
    List<NewUsersChartPoint> chartData;
    List<NewUsersInsight> insights;
}
