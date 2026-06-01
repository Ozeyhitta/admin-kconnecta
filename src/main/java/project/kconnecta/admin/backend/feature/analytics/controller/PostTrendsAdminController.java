package project.kconnecta.admin.backend.feature.analytics.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.admin.backend.feature.analytics.dto.response.PostTrendsResponse;
import project.kconnecta.admin.backend.feature.analytics.service.PostTrendsAnalyticsService;

/**
 * Post-trends analytics for the admin dashboard.
 * Secured by {@code /api/v1/admin/**} → ROLE_ADMIN in SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/admin/analytics")
@RequiredArgsConstructor
public class PostTrendsAdminController {

    private final PostTrendsAnalyticsService postTrendsAnalyticsService;

    /**
     * GET /api/v1/admin/analytics/post-trends?range=7d|30d
     *
     * @param range time window, "7d" (default) or "30d"; the previous equal-length
     *              window is used as the comparison baseline for growth_rate.
     */
    @GetMapping("/post-trends")
    public ResponseEntity<PostTrendsResponse> getPostTrends(
            @RequestParam(defaultValue = "7d") String range) {
        return ResponseEntity.ok(postTrendsAnalyticsService.getPostTrends(range));
    }
}
