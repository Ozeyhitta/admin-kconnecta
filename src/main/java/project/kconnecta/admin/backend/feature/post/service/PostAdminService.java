package project.kconnecta.admin.backend.feature.post.service;

import org.springframework.data.domain.Page;
import project.kconnecta.admin.backend.common.enums.PostStatus;
import project.kconnecta.admin.backend.feature.live.dto.response.LiveSessionAdminResponse;
import project.kconnecta.admin.backend.feature.post.dto.response.PostAdminResponse;
import project.kconnecta.admin.backend.feature.post.dto.response.PostShareDetailResponse;
import project.kconnecta.admin.backend.feature.post.dto.response.PostStatsResponse;

import java.time.LocalDate;
import java.util.UUID;

public interface PostAdminService {

    Page<PostAdminResponse> getPosts(int page, int size, String sortBy, String sortDir,
                                     String search, PostStatus status, UUID authorId,
                                     LocalDate createdFrom, LocalDate createdTo, String postType);

    PostAdminResponse getPostById(UUID id);

    PostAdminResponse updateStatus(UUID id, PostStatus status);

    void deletePost(UUID id);

    PostStatsResponse getPostStats(UUID id);

    /** The livestream session attached to a post, or {@code null} if the post is not a livestream. */
    LiveSessionAdminResponse getLiveSession(UUID postId);

    PostShareDetailResponse getShareById(UUID shareId);

    void deleteShare(UUID shareId);
}
