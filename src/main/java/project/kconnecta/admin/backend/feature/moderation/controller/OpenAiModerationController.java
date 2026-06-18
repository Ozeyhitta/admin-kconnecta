package project.kconnecta.admin.backend.feature.moderation.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.feature.moderation.dto.request.ModerationCheckRequest;
import project.kconnecta.admin.backend.feature.moderation.dto.response.ModerationCheckResponse;
import project.kconnecta.admin.backend.feature.moderation.service.GeminiModerationService;
import project.kconnecta.admin.backend.feature.policy.service.PolicyAdminService;

import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
public class OpenAiModerationController {

    private final GeminiModerationService service;
    private final PolicyAdminService policyAdminService;

    // Admin playground — requires ROLE_ADMIN (enforced by SecurityConfig).
    // Stays always-on so admins can test moderation even while it's disabled platform-wide.
    @PostMapping("/api/v1/admin/moderation/test")
    public ResponseEntity<ModerationCheckResponse> adminTest(@RequestBody ModerationCheckRequest req) {
        return ResponseEntity.ok(service.check(req));
    }

    // Public — called by user frontend before posting; /api/v1/internal/** is permitAll in SecurityConfig.
    // Respects the platform aiModeration.enabled toggle: when off, skip the AI call and return "clean".
    @PostMapping("/api/v1/internal/moderation/check")
    public ResponseEntity<ModerationCheckResponse> internalCheck(@RequestBody ModerationCheckRequest req) {
        if (!aiModerationEnabled()) {
            return ResponseEntity.ok(ModerationCheckResponse.builder()
                    .flagged(false)
                    .categories(Map.of())
                    .categoryScores(Map.of())
                    .categoryAppliedInputTypes(Map.of())
                    .build());
        }
        return ResponseEntity.ok(service.check(req));
    }

    /** Reads aiModeration.enabled from the shared policy. Fail-open (true) if the policy is unreachable. */
    private boolean aiModerationEnabled() {
        try {
            return policyAdminService.getConfig().path("aiModeration").path("enabled").asBoolean(true);
        } catch (Exception e) {
            log.warn("Could not read aiModeration.enabled, defaulting to enabled: {}", e.getMessage());
            return true;
        }
    }
}
