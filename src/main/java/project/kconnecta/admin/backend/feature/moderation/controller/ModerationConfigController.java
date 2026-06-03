package project.kconnecta.admin.backend.feature.moderation.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.feature.moderation.service.ModerationConfigService;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/moderation-config")
@RequiredArgsConstructor
public class ModerationConfigController {

    private final ModerationConfigService moderationConfigService;

    @GetMapping
    public ResponseEntity<Map<String, String>> getAll() {
        return ResponseEntity.ok(moderationConfigService.getAll());
    }

    @PutMapping
    public ResponseEntity<Map<String, String>> update(@RequestBody Map<String, String> updates) {
        return ResponseEntity.ok(moderationConfigService.update(updates));
    }
}
