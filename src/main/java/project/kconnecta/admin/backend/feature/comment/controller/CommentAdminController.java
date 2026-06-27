package project.kconnecta.admin.backend.feature.comment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.config.security.AdminPrincipal;
import project.kconnecta.admin.backend.feature.comment.dto.response.CommentAdminResponse;
import project.kconnecta.admin.backend.feature.comment.service.CommentAdminService;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/comments")
@RequiredArgsConstructor
public class CommentAdminController {

    private final CommentAdminService commentAdminService;

    @GetMapping
    public ResponseEntity<Page<CommentAdminResponse>> getComments(
            @AuthenticationPrincipal AdminPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID postId,
            @RequestParam(required = false) UUID authorId,
            @RequestParam(required = false) String status) {

        return ResponseEntity.ok(
                commentAdminService.getComments(
                        page, size, sortBy, sortDir, search, postId, authorId, status,
                        principal != null ? principal.getUserId() : null));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CommentAdminResponse> getCommentById(
            @AuthenticationPrincipal AdminPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(commentAdminService.getCommentById(
                id, principal != null ? principal.getUserId() : null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable UUID id) {
        commentAdminService.deleteComment(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/moderation-lock")
    public ResponseEntity<Void> acquireModerationLock(
            @AuthenticationPrincipal AdminPrincipal principal,
            @PathVariable UUID id) {
        commentAdminService.acquireModerationLock(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/moderation-lock/renew")
    public ResponseEntity<Void> renewModerationLock(
            @AuthenticationPrincipal AdminPrincipal principal,
            @PathVariable UUID id) {
        commentAdminService.renewModerationLock(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/moderation-lock")
    public ResponseEntity<Void> releaseModerationLock(
            @AuthenticationPrincipal AdminPrincipal principal,
            @PathVariable UUID id) {
        commentAdminService.releaseModerationLock(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Void> approveComment(
            @AuthenticationPrincipal AdminPrincipal principal,
            @PathVariable UUID id) {
        commentAdminService.approveComment(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Void> rejectComment(
            @AuthenticationPrincipal AdminPrincipal principal,
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body) {
        commentAdminService.rejectComment(id, body != null ? body.get("reason") : null, principal.getUserId());
        return ResponseEntity.noContent().build();
    }
}
