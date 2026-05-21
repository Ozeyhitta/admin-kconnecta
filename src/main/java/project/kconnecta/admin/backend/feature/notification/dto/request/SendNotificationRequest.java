package project.kconnecta.admin.backend.feature.notification.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SendNotificationRequest(
        @NotNull UUID targetUserId,
        @NotBlank String text) {
}
