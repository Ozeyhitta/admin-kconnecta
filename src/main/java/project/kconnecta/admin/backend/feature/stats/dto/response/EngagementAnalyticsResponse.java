package project.kconnecta.admin.backend.feature.stats.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Value;

/** Combined DAU/MAU + interaction analytics for the stats dashboard. */
@Value
@Builder
public class EngagementAnalyticsResponse {
    @JsonProperty("dauMau")
    DauMauAnalyticsResponse dauMau;
    InteractionAnalyticsResponse interactions;
}
