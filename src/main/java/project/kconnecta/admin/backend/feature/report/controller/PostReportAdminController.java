package project.kconnecta.admin.backend.feature.report.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.admin.backend.feature.report.dto.response.PostReportAdminResponse;
import project.kconnecta.admin.backend.feature.report.service.PostReportAdminService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/post-reports")
@RequiredArgsConstructor
public class PostReportAdminController {
    private final PostReportAdminService postReportAdminService;

    @GetMapping
    public ResponseEntity<Page<PostReportAdminResponse>> getReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID postId) {

        return ResponseEntity.ok(postReportAdminService.getReports(page, size, sortBy, sortDir, search, postId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostReportAdminResponse> getReportById(@PathVariable UUID id) {
        return ResponseEntity.ok(postReportAdminService.getReportById(id));
    }
}
