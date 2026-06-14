package project.kconnecta.admin.backend.feature.moderation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationCheckResponse {
    private boolean flagged;
    private Map<String, Boolean> categories;
    private Map<String, Double> categoryScores;
    private Map<String, List<String>> categoryAppliedInputTypes;
}
