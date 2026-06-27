package project.kconnecta.admin.backend.feature.support.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.feature.support.dto.request.RespondSupportRequest;
import project.kconnecta.admin.backend.feature.support.dto.response.SupportRequestAdminResponse;
import project.kconnecta.admin.backend.feature.support.service.SupportRequestAdminService;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/support-requests")
@RequiredArgsConstructor
public class SupportRequestAdminController {

    private final SupportRequestAdminService supportRequestAdminService;

    @GetMapping
    public ResponseEntity<Page<SupportRequestAdminResponse>> getRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {

        return ResponseEntity.ok(
                supportRequestAdminService.getRequests(page, size, sortBy, sortDir, search, category, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SupportRequestAdminResponse> getRequestById(@PathVariable UUID id) {
        return ResponseEntity.ok(supportRequestAdminService.getRequestById(id));
    }

    /** Cập nhật trạng thái xử lý. Body: {"status": "IN_PROGRESS" | "RESOLVED" | "PENDING"}. */
    @PatchMapping("/{id}/status")
    public ResponseEntity<SupportRequestAdminResponse> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(supportRequestAdminService.updateStatus(id, body.get("status")));
    }

    /** Phản hồi yêu cầu hỗ trợ — gửi thông báo cho người dùng. Body: {"message": "...", "markResolved": true}. */
    @PostMapping("/{id}/respond")
    public ResponseEntity<SupportRequestAdminResponse> respond(
            @PathVariable UUID id,
            @Valid @RequestBody RespondSupportRequest body) {
        return ResponseEntity.ok(
                supportRequestAdminService.respond(id, body.message(), body.markResolved()));
    }
}
