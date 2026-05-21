package project.kconnecta.admin.backend.feature.notification.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BroadcastNotificationRequest(@NotBlank String text) {
}
