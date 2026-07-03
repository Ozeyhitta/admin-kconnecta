package project.kconnecta.admin.backend.feature.post.service.impl;

import project.kconnecta.admin.backend.feature.post.service.PostAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.common.enums.PostStatus;
import project.kconnecta.admin.backend.common.enums.ReportCategory;
import project.kconnecta.admin.backend.common.util.CloudinaryPostMediaService;
import project.kconnecta.admin.backend.entity.Post;
import project.kconnecta.admin.backend.entity.PostMedia;
import project.kconnecta.admin.backend.entity.PostShare;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.live.dto.response.LiveSessionAdminResponse;
import project.kconnecta.admin.backend.feature.live.repository.LiveSessionAdminRepository;
import project.kconnecta.admin.backend.feature.post.dto.response.PostAdminResponse;
import project.kconnecta.admin.backend.feature.post.dto.response.PostMediaAdminResponse;
import project.kconnecta.admin.backend.feature.post.dto.response.PostShareDetailResponse;
import project.kconnecta.admin.backend.feature.post.dto.response.PostStatsResponse;
import project.kconnecta.admin.backend.feature.post.repository.PostAdminRepository;
import project.kconnecta.admin.backend.feature.post.repository.PostMediaAdminRepository;
import project.kconnecta.admin.backend.feature.post.repository.PostShareAdminRepository;
import project.kconnecta.admin.backend.feature.report.repository.PostReportAdminRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostAdminServiceImpl implements PostAdminService {

    private final PostAdminRepository postAdminRepository;
    private final PostMediaAdminRepository postMediaAdminRepository;
    private final CloudinaryPostMediaService cloudinaryPostMediaService;
    private final PostShareAdminRepository postShareAdminRepository;
    private final PostReportAdminRepository postReportAdminRepository;
    private final LiveSessionAdminRepository liveSessionAdminRepository;

    @Override
    public Page<PostAdminResponse> getPosts(int page, int size, String sortBy, String sortDir,
                                            String search, PostStatus status, UUID authorId,
                                            LocalDate createdFrom, LocalDate createdTo, String postType) {
        String pattern = (search != null && !search.isBlank())
                ? "%" + search.trim().toLowerCase(Locale.ROOT) + "%"
                : null;
        LocalDateTime createdFromDt = createdFrom != null ? createdFrom.atStartOfDay() : null;
        LocalDateTime createdToExclusive = createdTo != null ? createdTo.plusDays(1).atStartOfDay() : null;

        String type = normalizePostType(postType);
        Pageable postPageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
        Pageable sharePageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        if ("ORIGINAL".equals(type)) {
            Page<Post> posts = postAdminRepository.findAllFiltered(
                    pattern, status, authorId, createdFromDt, createdToExclusive, postPageable);
            return new PageImpl<>(mapPosts(posts.getContent()),
                    PageRequest.of(page, size), posts.getTotalElements());
        }

        if ("SHARE".equals(type)) {
            Page<PostShare> shares = postShareAdminRepository.findAllFiltered(
                    pattern, status, authorId, createdFromDt, createdToExclusive, sharePageable);
            return new PageImpl<>(mapShares(shares.getContent()),
                    PageRequest.of(page, size), shares.getTotalElements());
        }

        // ALL: merge originals + shares, globally sorted by recency, then page in memory.
        int limit = Math.max((page + 1) * size, 1);
        Page<Post> postsPage = postAdminRepository.findAllFiltered(
                pattern, status, authorId, createdFromDt, createdToExclusive,
                PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "updatedAt")));
        Page<PostShare> sharesPage = postShareAdminRepository.findAllFiltered(
                pattern, status, authorId, createdFromDt, createdToExclusive,
                PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt")));

        List<PostAdminResponse> merged = new ArrayList<>();
        merged.addAll(mapPosts(postsPage.getContent()));
        merged.addAll(mapShares(sharesPage.getContent()));
        merged.sort(Comparator.comparing(PostAdminResponse::getUpdatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));

        int fromIndex = Math.min(page * size, merged.size());
        int toIndex = Math.min(fromIndex + size, merged.size());
        List<PostAdminResponse> pageContent = new ArrayList<>(merged.subList(fromIndex, toIndex));
        long total = postsPage.getTotalElements() + sharesPage.getTotalElements();
        return new PageImpl<>(pageContent, PageRequest.of(page, size), total);
    }

    private String normalizePostType(String postType) {
        if (postType == null) {
            return "ALL";
        }
        String upper = postType.trim().toUpperCase(Locale.ROOT);
        return switch (upper) {
            case "ORIGINAL", "SHARE" -> upper;
            default -> "ALL";
        };
    }

    private List<PostAdminResponse> mapPosts(List<Post> posts) {
        List<UUID> ids = posts.stream().map(Post::getId).toList();
        Map<UUID, Long> counts = loadReportCounts(ids);
        Map<UUID, PostReportAdminRepository.LatestPostReportView> latest = loadLatestReports(ids);
        Map<UUID, List<PostMediaAdminResponse>> media = loadMedia(ids);
        return posts.stream().map(p -> {
            PostReportAdminRepository.LatestPostReportView lv = latest.get(p.getId());
            return PostAdminResponse.from(
                    p,
                    counts.getOrDefault(p.getId(), 0L),
                    parseCategory(lv != null ? lv.getCategory() : null),
                    lv != null ? lv.getReason() : null,
                    media.getOrDefault(p.getId(), List.of()));
        }).collect(Collectors.toList());
    }

    private List<PostAdminResponse> mapShares(List<PostShare> shares) {
        List<UUID> originalIds = shares.stream().map(s -> s.getPost().getId()).toList();
        Map<UUID, List<PostMediaAdminResponse>> media = loadMedia(originalIds);
        return shares.stream().map(s -> {
            UUID originalId = s.getPost().getId();
            return PostAdminResponse.fromShare(
                    s,
                    0L,
                    null,
                    null,
                    media.getOrDefault(originalId, List.of()));
        }).collect(Collectors.toList());
    }

    @Override
    public PostAdminResponse getPostById(UUID id) {
        Post post = findPost(id);
        long reportCount = postReportAdminRepository.countByPost_Id(id);
        PostReportAdminRepository.LatestPostReportView latest = loadLatestReports(List.of(id)).get(id);
        return PostAdminResponse.from(
                post,
                reportCount,
                parseCategory(latest != null ? latest.getCategory() : null),
                latest != null ? latest.getReason() : null,
                loadMedia(List.of(id)).getOrDefault(id, List.of()));
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
        List<PostMedia> media = postMediaAdminRepository.findByPostIdOrderBySortOrderAsc(id);
        cloudinaryPostMediaService.deletePostAssets(media, post.getImageUrl());
        postMediaAdminRepository.deleteByPostId(id);
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

    @Override
    public LiveSessionAdminResponse getLiveSession(UUID postId) {
        return liveSessionAdminRepository.findFirstByPostIdOrderByCreatedAtDesc(postId)
                .map(LiveSessionAdminResponse::from)
                .orElse(null);
    }

    @Override
    public PostShareDetailResponse getShareById(UUID shareId) {
        PostShare share = postShareAdminRepository.findByIdWithDetails(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found: " + shareId));
        Post original = share.getPost();
        long reportCount = postReportAdminRepository.countByPost_Id(original.getId());
        PostReportAdminRepository.LatestPostReportView latest =
                loadLatestReports(List.of(original.getId())).get(original.getId());
        PostAdminResponse originalResponse = PostAdminResponse.from(
                original,
                reportCount,
                parseCategory(latest != null ? latest.getCategory() : null),
                latest != null ? latest.getReason() : null,
                loadMedia(List.of(original.getId())).getOrDefault(original.getId(), List.of()));
        return PostShareDetailResponse.from(share, originalResponse);
    }

    @Override
    @Transactional
    public void deleteShare(UUID shareId) {
        PostShare share = postShareAdminRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found: " + shareId));
        postShareAdminRepository.detachChildren(shareId);
        postShareAdminRepository.deleteCommentsByShareId(shareId);
        postShareAdminRepository.delete(share);
    }

    private Post findPost(UUID id) {
        return postAdminRepository.findByIdWithAuthor(id)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + id));
    }

    private Map<UUID, Long> loadReportCounts(Collection<UUID> postIds) {
        if (postIds.isEmpty()) {
            return Map.of();
        }
        return postReportAdminRepository.countByPostIds(postIds).stream()
                .collect(Collectors.toMap(
                        PostReportAdminRepository.PostReportCountView::getPostId,
                        PostReportAdminRepository.PostReportCountView::getReportCount));
    }

    private Map<UUID, PostReportAdminRepository.LatestPostReportView> loadLatestReports(Collection<UUID> postIds) {
        if (postIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, PostReportAdminRepository.LatestPostReportView> latest = new HashMap<>();
        for (PostReportAdminRepository.LatestPostReportView row : postReportAdminRepository.findLatestByPostIds(postIds)) {
            latest.put(row.getPostId(), row);
        }
        return latest;
    }

    private Map<UUID, List<PostMediaAdminResponse>> loadMedia(Collection<UUID> postIds) {
        if (postIds.isEmpty()) {
            return Map.of();
        }
        return postMediaAdminRepository.findByPostIdInOrderByPostIdAscSortOrderAsc(postIds).stream()
                .collect(Collectors.groupingBy(
                        media -> media.getPostId(),
                        Collectors.mapping(PostMediaAdminResponse::from, Collectors.toList())));
    }

    private ReportCategory parseCategory(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return ReportCategory.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
