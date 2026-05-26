package project.kconnecta.admin.backend.feature.stats.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class DauMauResponse {
    long dau;
    long mau;
    double dauMauRatio;
    List<DauMauTrendPointResponse> dauTrend;
}
