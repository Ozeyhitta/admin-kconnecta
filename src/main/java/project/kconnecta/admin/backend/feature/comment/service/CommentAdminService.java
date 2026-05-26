package project.kconnecta.admin.backend.feature.comment.service;

import org.springframework.data.domain.Page;
import project.kconnecta.admin.backend.feature.comment.dto.response.CommentAdminResponse;

import java.util.UUID;

public interface CommentAdminService {

    Page<CommentAdminResponse> getComments(int page, int size, String sortBy, String sortDir,
                                           String search, UUID postId, UUID authorId);

    CommentAdminResponse getCommentById(UUID id);

    void deleteComment(UUID id);
}
