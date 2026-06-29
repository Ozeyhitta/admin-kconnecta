package project.kconnecta.admin.backend.feature.post.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.feature.post.dto.response.PostShareDetailResponse;
import project.kconnecta.admin.backend.feature.post.service.PostAdminService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/post-shares")
@RequiredArgsConstructor
public class PostShareAdminController {

    private final PostAdminService postAdminService;

    @GetMapping("/{id}")
    public ResponseEntity<PostShareDetailResponse> getShareById(@PathVariable UUID id) {
        return ResponseEntity.ok(postAdminService.getShareById(id));
    }

    /** Removes only this share (and comments written on it); the original post is kept. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShare(@PathVariable UUID id) {
        postAdminService.deleteShare(id);
        return ResponseEntity.noContent().build();
    }
}
