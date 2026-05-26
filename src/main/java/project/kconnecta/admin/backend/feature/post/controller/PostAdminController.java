package project.kconnecta.admin.backend.feature.post.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.common.enums.PostStatus;
import project.kconnecta.admin.backend.feature.post.dto.request.UpdatePostStatusRequest;
import project.kconnecta.admin.backend.feature.post.dto.response.PostAdminResponse;
import project.kconnecta.admin.backend.feature.post.dto.response.PostStatsResponse;
import project.kconnecta.admin.backend.feature.post.service.PostAdminService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/posts")
@RequiredArgsConstructor
public class PostAdminController {

    private final PostAdminService postAdminService;

    @GetMapping
    public ResponseEntity<Page<PostAdminResponse>> getPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) PostStatus status,
            @RequestParam(required = false) UUID authorId) {

        return ResponseEntity.ok(
                postAdminService.getPosts(page, size, sortBy, sortDir, search, status, authorId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostAdminResponse> getPostById(@PathVariable UUID id) {
        return ResponseEntity.ok(postAdminService.getPostById(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PostAdminResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePostStatusRequest request) {

        return ResponseEntity.ok(postAdminService.updateStatus(id, request.getStatus()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable UUID id) {
        postAdminService.deletePost(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<PostStatsResponse> getPostStats(@PathVariable UUID id) {
        return ResponseEntity.ok(postAdminService.getPostStats(id));
    }
}
