package project.kconnecta.admin.backend.feature.stats.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class InteractionSummary {
    long totalInteractions;
    double averageInteractionsPerDay;
    String peakInteractionDay;
    long peakInteractionCount;
    String interactionTrendStatus;
    Double interactionGrowthRate;
    String topInteractionType;
}
