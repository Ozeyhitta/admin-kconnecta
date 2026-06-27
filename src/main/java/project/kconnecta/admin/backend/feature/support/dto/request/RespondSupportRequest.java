package project.kconnecta.admin.backend.feature.support.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RespondSupportRequest(
        @NotBlank String message,
        Boolean markResolved) {
}
