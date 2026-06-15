package project.kconnecta.admin.backend.feature.post.service.impl;

import project.kconnecta.admin.backend.feature.post.service.PostAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.common.enums.PostStatus;
import project.kconnecta.admin.backend.common.enums.ReportCategory;
import project.kconnecta.admin.backend.entity.Post;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.post.dto.response.PostAdminResponse;
import project.kconnecta.admin.backend.feature.post.dto.response.PostStatsResponse;
import project.kconnecta.admin.backend.feature.post.repository.PostAdminRepository;
import project.kconnecta.admin.backend.feature.report.repository.PostReportAdminRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostAdminServiceImpl implements PostAdminService {

    private final PostAdminRepository postAdminRepository;
    private final PostReportAdminRepository postReportAdminRepository;

    @Override
    public Page<PostAdminResponse> getPosts(int page, int size, String sortBy, String sortDir,
                                            String search, PostStatus status, UUID authorId) {
        Sort.Direction direction = Sort.Direction.fromString(sortDir.toUpperCase());
        Set<String> validFields = Set.of("createdAt", "updatedAt", "publishedAt", "status", "privacy");
        String safeField = validFields.contains(sortBy) ? sortBy : "createdAt";
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, safeField));

        String pattern = (search != null && !search.isBlank())
                ? "%" + search.trim().toLowerCase(java.util.Locale.ROOT) + "%"
                : null;

        Page<Post> posts = postAdminRepository.findAllFiltered(pattern, status, authorId, pageable);
        Map<UUID, Long> reportCounts = loadReportCounts(posts.getContent());
        Map<UUID, PostReportAdminRepository.LatestPostReportView> latestReports = loadLatestReports(posts.getContent());

        return posts.map(post -> {
            UUID postId = post.getId();
            long reportCount = reportCounts.getOrDefault(postId, 0L);
            PostReportAdminRepository.LatestPostReportView latest = latestReports.get(postId);
            ReportCategory latestCategory = parseCategory(latest != null ? latest.getCategory() : null);
            String latestReason = latest != null ? latest.getReason() : null;
            return PostAdminResponse.from(post, reportCount, latestCategory, latestReason);
        });
    }

    @Override
    public PostAdminResponse getPostById(UUID id) {
        Post post = findPost(id);
        long reportCount = postReportAdminRepository.countByPost_Id(id);
        PostReportAdminRepository.LatestPostReportView latest =
                loadLatestReports(List.of(post)).get(id);
        return PostAdminResponse.from(
                post,
                reportCount,
                parseCategory(latest != null ? latest.getCategory() : null),
                latest != null ? latest.getReason() : null
        );
    }

    @Override
    @Transactional
    public PostAdminResponse updateStatus(UUID id, PostStatus status) {
        Post post = findPost(id);
        post.setStatus(status);
        return getPostById(postAdminRepository.saveAndFlush(post).getId());
    }

    @Override
    @Transactional
    public void deletePost(UUID id) {
        Post post = findPost(id);
        postAdminRepository.deleteReportsByPostId(id);
        postAdminRepository.deleteReactionsByPostId(id);
        postAdminRepository.deleteSharesByPostId(id);
        postAdminRepository.deleteCommentsByPostId(id);
        postAdminRepository.delete(post);
    }

    @Override
    public PostStatsResponse getPostStats(UUID id) {
        findPost(id);
        return PostStatsResponse.builder()
                .reactionCount(postAdminRepository.countReactionsByPostId(id))
                .commentCount(postAdminRepository.countCommentsByPostId(id))
                .shareCount(postAdminRepository.countSharesByPostId(id))
                .reportCount(postReportAdminRepository.countByPost_Id(id))
                .build();
    }

    private Post findPost(UUID id) {
        return postAdminRepository.findByIdWithAuthor(id)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + id));
    }

    private Map<UUID, Long> loadReportCounts(List<Post> posts) {
        List<UUID> postIds = posts.stream().map(Post::getId).toList();
        if (postIds.isEmpty()) {
            return Map.of();
        }
        return postReportAdminRepository.countByPostIds(postIds).stream()
                .collect(Collectors.toMap(
                        PostReportAdminRepository.PostReportCountView::getPostId,
                        PostReportAdminRepository.PostReportCountView::getReportCount
                ));
    }

    private Map<UUID, PostReportAdminRepository.LatestPostReportView> loadLatestReports(List<Post> posts) {
        List<UUID> postIds = posts.stream().map(Post::getId).toList();
        if (postIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, PostReportAdminRepository.LatestPostReportView> latest = new HashMap<>();
        for (PostReportAdminRepository.LatestPostReportView row : postReportAdminRepository.findLatestByPostIds(postIds)) {
            latest.put(row.getPostId(), row);
        }
        return latest;
    }

    private ReportCategory parseCategory(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return ReportCategory.valueOf(raw.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
