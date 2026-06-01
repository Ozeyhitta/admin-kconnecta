package project.kconnecta.admin.backend.feature.stats.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

/** Shared insight/alert item for stats analytics sections. */
@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AnalyticsInsight {
    String type;
    /** info | warning | danger | success */
    String level;
    String title;
    String message;
    /** Optional admin action suggestion. */
    String actionSuggestion;
}
