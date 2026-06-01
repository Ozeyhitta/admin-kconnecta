package project.kconnecta.admin.backend.feature.moderation.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ResolveAlertRequest {
    private String resolvedBy;
}
