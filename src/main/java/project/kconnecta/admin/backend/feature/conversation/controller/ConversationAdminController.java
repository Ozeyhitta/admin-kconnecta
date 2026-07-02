package project.kconnecta.admin.backend.feature.conversation.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.admin.backend.feature.conversation.dto.request.UpdateStatusRequest;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminChatAuditLogResponse;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationDetailResponse;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationPageResponse;
import project.kconnecta.admin.backend.feature.conversation.service.ConversationAdminService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/conversations")
@RequiredArgsConstructor
public class ConversationAdminController {

    private final ConversationAdminService conversationAdminService;

    @GetMapping
    public ResponseEntity<AdminConversationPageResponse> getPrivateConversations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "lastMessageAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String q
    ) {
        return ResponseEntity.ok(
                conversationAdminService.getPrivateConversations(page, size, sortBy, sortDir, q));
     }

     @GetMapping("/{id}")
     public ResponseEntity<AdminConversationDetailResponse> getPrivateConversation(@PathVariable String id) {
         return ResponseEntity.ok(conversationAdminService.getPrivateConversation(id));
     }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AdminChatAuditLogResponse>> getAuditLogs(@RequestParam String conversationId) {
        if (!isCurrentSuperAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Chỉ Super Admin mới có quyền xem nhật ký kiểm duyệt.");
        }
        return ResponseEntity.ok(conversationAdminService.getAuditLogs(conversationId));
    }

    private boolean isCurrentSuperAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable String id) {
        conversationAdminService.deleteConversation(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<Void> deleteMessage(@PathVariable String messageId) {
        conversationAdminService.deleteMessage(messageId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateConversationStatus(
            @PathVariable String id,
            @RequestBody UpdateStatusRequest request,
            java.security.Principal principal
    ) {
        String adminUsername = principal != null ? principal.getName() : "SYSTEM";
        conversationAdminService.updateConversationStatus(id, request.getStatus(), request.getReason(), adminUsername);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{conversationId}/messages/{messageId}/status")
    public ResponseEntity<Void> updateMessageStatus(
            @PathVariable String conversationId,
            @PathVariable String messageId,
            @RequestBody UpdateStatusRequest request,
            java.security.Principal principal
    ) {
        String adminUsername = principal != null ? principal.getName() : "SYSTEM";
        conversationAdminService.updateMessageStatus(conversationId, messageId, request.getStatus(), request.getReason(), adminUsername);
        return ResponseEntity.noContent().build();
    }
}
