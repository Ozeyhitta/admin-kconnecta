package project.kconnecta.admin.backend.feature.post.service.impl;

import project.kconnecta.admin.backend.feature.post.service.PostAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.common.enums.PostStatus;
import project.kconnecta.admin.backend.entity.Post;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.post.dto.response.PostAdminResponse;
import project.kconnecta.admin.backend.feature.post.dto.response.PostStatsResponse;
import project.kconnecta.admin.backend.feature.post.repository.PostAdminRepository;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PostAdminServiceImpl implements PostAdminService {

    private final PostAdminRepository postAdminRepository;

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

        return postAdminRepository
                .findAllFiltered(pattern, status, authorId, pageable)
                .map(PostAdminResponse::from);
    }

    @Override
    public PostAdminResponse getPostById(UUID id) {
        return PostAdminResponse.from(findPost(id));
    }

    @Override
    @Transactional
    public PostAdminResponse updateStatus(UUID id, PostStatus status) {
        Post post = findPost(id);
        post.setStatus(status);
        return PostAdminResponse.from(postAdminRepository.saveAndFlush(post));
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
                .build();
    }

    private Post findPost(UUID id) {
        return postAdminRepository.findByIdWithAuthor(id)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + id));
    }
}
