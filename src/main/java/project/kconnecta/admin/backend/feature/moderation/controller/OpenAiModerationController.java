package project.kconnecta.admin.backend.feature.moderation.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.feature.moderation.dto.request.ModerationCheckRequest;
import project.kconnecta.admin.backend.feature.moderation.dto.response.ModerationCheckResponse;
import project.kconnecta.admin.backend.feature.moderation.service.GeminiModerationService;

@RestController
@RequiredArgsConstructor
public class OpenAiModerationController {

    private final GeminiModerationService service;

    // Admin playground — requires ROLE_ADMIN (enforced by SecurityConfig)
    @PostMapping("/api/v1/admin/moderation/test")
    public ResponseEntity<ModerationCheckResponse> adminTest(@RequestBody ModerationCheckRequest req) {
        return ResponseEntity.ok(service.check(req));
    }

    // Public — called by user frontend; /api/v1/internal/** is permitAll in SecurityConfig
    @PostMapping("/api/v1/internal/moderation/check")
    public ResponseEntity<ModerationCheckResponse> internalCheck(@RequestBody ModerationCheckRequest req) {
        return ResponseEntity.ok(service.check(req));
    }
}
