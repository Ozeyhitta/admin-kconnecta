package project.kconnecta.admin.backend.feature.notification.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.admin.backend.feature.moderation.service.AdminAlertService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/internal")
@RequiredArgsConstructor
public class InternalAccountReviewController {

    private final AdminAlertService adminAlertService;

    @Value("${user-service.internal-key:kconnecta-internal-secret}")
    private String internalKey;

    @PostMapping("/account-review-requests")
    public ResponseEntity<Void> createAccountReviewAlert(
            @RequestHeader(value = "X-Internal-Key", required = false) String key,
            @Valid @RequestBody AccountReviewRequestBody body
    ) {
        assertInternalKey(key);
        adminAlertService.createAccountReviewIfNotExists(body.userId(), body.username(), body.reason());
        return ResponseEntity.ok().build();
    }

    private void assertInternalKey(String key) {
        if (key == null || !internalKey.equals(key)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal key");
        }
    }

    public record AccountReviewRequestBody(
            @NotNull UUID userId,
            String username,
            String reason
    ) {
    }
}
