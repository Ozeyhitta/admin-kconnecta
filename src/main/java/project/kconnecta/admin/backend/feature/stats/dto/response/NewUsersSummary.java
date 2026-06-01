package project.kconnecta.admin.backend.feature.stats.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class NewUsersSummary {
    long totalNewUsers;
    double averagePerDay;
    String peakDay;
    long peakCount;
    String lowestDay;
    long lowestCount;
    long currentPeriodCount;
    long previousPeriodCount;
    Double growthRate;   // null when previousPeriodCount = 0 and currentPeriodCount > 0
    String trendStatus;
}
