package project.kconnecta.admin.backend.feature.moderation.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.common.enums.AlertStatus;
import project.kconnecta.admin.backend.common.enums.AlertType;
import project.kconnecta.admin.backend.feature.moderation.dto.request.ResolveAlertRequest;
import project.kconnecta.admin.backend.feature.moderation.dto.response.AdminAlertPageResponse;
import project.kconnecta.admin.backend.feature.moderation.dto.response.AdminAlertResponse;
import project.kconnecta.admin.backend.feature.moderation.entity.AdminAlert;
import project.kconnecta.admin.backend.feature.moderation.service.AdminAlertService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/chat-alerts")
@RequiredArgsConstructor
public class ChatAlertAdminController {

    private final AdminAlertService adminAlertService;

    @GetMapping
    public ResponseEntity<AdminAlertPageResponse> findAlerts(
            @RequestParam(required = false) AlertStatus status,
            @RequestParam(required = false) AlertType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<AdminAlert> alertPage = adminAlertService.findAlerts(status, type, page, size);
        AdminAlertPageResponse response = AdminAlertPageResponse.builder()
                .content(alertPage.getContent().stream().map(AdminAlertResponse::from).toList())
                .totalElements(alertPage.getTotalElements())
                .totalPages(alertPage.getTotalPages())
                .page(alertPage.getNumber())
                .size(alertPage.getSize())
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminAlertResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(AdminAlertResponse.from(adminAlertService.findById(id)));
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<AdminAlertResponse> resolve(
            @PathVariable UUID id,
            @RequestBody ResolveAlertRequest request
    ) {
        return ResponseEntity.ok(AdminAlertResponse.from(adminAlertService.resolve(id, request.getResolvedBy())));
    }

    @PatchMapping("/{id}/dismiss")
    public ResponseEntity<AdminAlertResponse> dismiss(@PathVariable UUID id) {
        return ResponseEntity.ok(AdminAlertResponse.from(adminAlertService.dismiss(id)));
    }
}
