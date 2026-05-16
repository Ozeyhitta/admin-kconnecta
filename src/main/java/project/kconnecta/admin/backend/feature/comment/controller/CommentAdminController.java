package project.kconnecta.admin.backend.feature.comment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.feature.comment.dto.CommentAdminResponse;
import project.kconnecta.admin.backend.feature.comment.service.CommentAdminService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/comments")
@RequiredArgsConstructor
public class CommentAdminController {

    private final CommentAdminService commentAdminService;

    @GetMapping
    public ResponseEntity<Page<CommentAdminResponse>> getComments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID postId,
            @RequestParam(required = false) UUID authorId) {

        return ResponseEntity.ok(
                commentAdminService.getComments(page, size, sortBy, sortDir, search, postId, authorId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CommentAdminResponse> getCommentById(@PathVariable UUID id) {
        return ResponseEntity.ok(commentAdminService.getCommentById(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable UUID id) {
        commentAdminService.deleteComment(id);
        return ResponseEntity.noContent().build();
    }
}
