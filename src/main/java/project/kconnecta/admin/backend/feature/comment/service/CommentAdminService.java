package project.kconnecta.admin.backend.feature.comment.service;

import org.springframework.data.domain.Page;
import project.kconnecta.admin.backend.feature.comment.dto.response.CommentAdminResponse;

import java.util.UUID;

public interface CommentAdminService {

    Page<CommentAdminResponse> getComments(int page, int size, String sortBy, String sortDir,
                                           String search, UUID postId, UUID authorId, String status);

    CommentAdminResponse getCommentById(UUID id);

    void deleteComment(UUID id);

    /** Duyệt comment PENDING — gọi user backend để giữ đúng logic (gửi notification). */
    void approveComment(UUID id);

    /** Từ chối comment PENDING — gọi user backend. */
    void rejectComment(UUID id, String reason);
}
