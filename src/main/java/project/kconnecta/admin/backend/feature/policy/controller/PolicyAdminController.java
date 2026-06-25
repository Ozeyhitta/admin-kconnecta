package project.kconnecta.admin.backend.feature.policy.controller;

import tools.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.admin.backend.config.security.AdminPrincipal;
import project.kconnecta.admin.backend.feature.policy.service.PolicyAdminService;

@RestController
@RequestMapping("/api/v1/admin/policies")
@RequiredArgsConstructor
public class PolicyAdminController {

    private final PolicyAdminService policyAdminService;

    @GetMapping
    public ResponseEntity<JsonNode> getConfig() {
        return ResponseEntity.ok(policyAdminService.getConfig());
    }

    @PutMapping
    public ResponseEntity<JsonNode> saveConfig(
            @AuthenticationPrincipal AdminPrincipal principal,
            @RequestBody JsonNode config) {
        String updatedBy = principal != null && principal.getName() != null
                ? principal.getName()
                : "admin";
        return ResponseEntity.ok(policyAdminService.saveConfig(config, updatedBy));
    }

    @PostMapping("/reset-to-default")
    public ResponseEntity<JsonNode> resetToDefault(
            @AuthenticationPrincipal AdminPrincipal principal) {
        String updatedBy = principal != null && principal.getName() != null
                ? principal.getName()
                : "admin";
        return ResponseEntity.ok(policyAdminService.resetToDefault(updatedBy));
    }
}
