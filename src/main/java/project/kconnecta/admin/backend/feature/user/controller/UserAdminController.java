package project.kconnecta.admin.backend.feature.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.common.enums.AccountRole;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.feature.user.dto.request.ResetPasswordRequest;
import project.kconnecta.admin.backend.feature.user.dto.request.UpdateRoleRequest;
import project.kconnecta.admin.backend.feature.user.dto.request.UpdateStatusRequest;
import project.kconnecta.admin.backend.feature.user.dto.response.AdminUserResponseDTO;
import project.kconnecta.admin.backend.feature.user.service.AdminUserService;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class UserAdminController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<Page<AdminUserResponseDTO>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) AccountStatus status,
            @RequestParam(required = false) AccountRole role) {

        return ResponseEntity.ok(
                adminUserService.getUsers(page, size, sortBy, sortDir, search, status, role));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminUserResponseDTO> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminUserService.getUserById(id));
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> countUsersInRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        long count = adminUserService.countUsersRegisteredBetween(from, to);
        return ResponseEntity.ok(Map.of("count", count, "from", from.toString(), "to", to.toString()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AdminUserResponseDTO> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStatusRequest request) {

        return ResponseEntity.ok(adminUserService.updateStatus(id, request.getStatus()));
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<AdminUserResponseDTO> resetPassword(
            @PathVariable UUID id,
            @Valid @RequestBody ResetPasswordRequest request) {

        return ResponseEntity.ok(adminUserService.resetPassword(id, request.getNewPassword()));
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<AdminUserResponseDTO> updateRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRoleRequest request) {

        return ResponseEntity.ok(adminUserService.updateRole(id, request.getRole()));
    }
}
