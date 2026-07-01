package project.kconnecta.admin.backend.feature.conversation.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationDetailResponse;
import project.kconnecta.admin.backend.feature.conversation.dto.response.AdminConversationPageResponse;
import project.kconnecta.admin.backend.feature.conversation.service.ConversationAdminService;

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
}
