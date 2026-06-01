package project.kconnecta.admin.backend.feature.stats.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class DauMauSummary {
    long dauToday;
    long mau30Days;
    double dauMauRatio;
    double averageDau30Days;
    String peakDauDay;
    long peakDauCount;
    String dauTrendStatus;
    int consecutiveDauDropDays;
    long previousPeriodDau;
    Double dauGrowthRate;
}
