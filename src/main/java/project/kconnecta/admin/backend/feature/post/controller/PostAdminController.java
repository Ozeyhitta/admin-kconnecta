package project.kconnecta.admin.backend.feature.post.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.common.enums.PostStatus;
import project.kconnecta.admin.backend.feature.live.dto.response.LiveSessionAdminResponse;
import project.kconnecta.admin.backend.feature.post.dto.request.UpdatePostStatusRequest;
import project.kconnecta.admin.backend.feature.post.dto.response.PostAdminResponse;
import project.kconnecta.admin.backend.feature.post.dto.response.PostStatsResponse;
import project.kconnecta.admin.backend.feature.post.service.PostAdminService;

import java.time.LocalDate;
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
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) PostStatus status,
            @RequestParam(required = false) UUID authorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdTo,
            @RequestParam(defaultValue = "ALL") String postType) {

        return ResponseEntity.ok(
                postAdminService.getPosts(page, size, sortBy, sortDir, search, status, authorId, createdFrom, createdTo, postType));
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

    @GetMapping("/{id}/live-session")
    public ResponseEntity<LiveSessionAdminResponse> getLiveSession(@PathVariable UUID id) {
        LiveSessionAdminResponse session = postAdminService.getLiveSession(id);
        return session != null ? ResponseEntity.ok(session) : ResponseEntity.notFound().build();
    }
}
