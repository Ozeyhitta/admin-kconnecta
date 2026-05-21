package project.kconnecta.admin.backend.feature.notification.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SendBatchNotificationRequest(
        @NotEmpty List<UUID> targetUserIds,
        @NotBlank String text
) {
}
