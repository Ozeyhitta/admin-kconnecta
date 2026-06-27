package project.kconnecta.admin.backend.feature.comment.service;

import org.springframework.data.domain.Page;
import project.kconnecta.admin.backend.feature.comment.dto.response.CommentAdminResponse;

import java.util.UUID;

public interface CommentAdminService {

    Page<CommentAdminResponse> getComments(int page, int size, String sortBy, String sortDir,
                                           String search, UUID postId, UUID authorId, String status,
                                           UUID viewerAdminId);

    CommentAdminResponse getCommentById(UUID id, UUID viewerAdminId);

    void deleteComment(UUID id);

    void acquireModerationLock(UUID id, UUID adminId);

    void renewModerationLock(UUID id, UUID adminId);

    void releaseModerationLock(UUID id, UUID adminId);

    /** Duyệt comment PENDING — gọi user backend để giữ đúng logic (gửi notification). */
    void approveComment(UUID id, UUID adminId);

    /** Từ chối comment PENDING — gọi user backend. */
    void rejectComment(UUID id, String reason, UUID adminId);
}
