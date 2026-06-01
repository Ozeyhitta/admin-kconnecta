package project.kconnecta.admin.backend.feature.comment.service.impl;

import project.kconnecta.admin.backend.feature.comment.service.CommentAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.entity.PostComment;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.comment.dto.response.CommentAdminResponse;
import project.kconnecta.admin.backend.feature.comment.repository.CommentAdminRepository;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommentAdminServiceImpl implements CommentAdminService {

    private final CommentAdminRepository commentAdminRepository;

    @Override
    public Page<CommentAdminResponse> getComments(int page, int size, String sortBy, String sortDir,
                                                  String search, UUID postId, UUID authorId) {
        Sort.Direction direction = Sort.Direction.fromString(sortDir.toUpperCase());
        Set<String> validFields = Set.of("createdAt", "updatedAt");
        String safeField = validFields.contains(sortBy) ? sortBy : "createdAt";
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, safeField));

        String pattern = (search != null && !search.isBlank())
                ? "%" + search.trim().toLowerCase(java.util.Locale.ROOT) + "%"
                : null;

        return commentAdminRepository
                .findAllFiltered(pattern, postId, authorId, pageable)
                .map(CommentAdminResponse::from);
    }

    @Override
    public CommentAdminResponse getCommentById(UUID id) {
        return CommentAdminResponse.from(findComment(id));
    }

    @Override
    @Transactional
    public void deleteComment(UUID id) {
        PostComment comment = findComment(id);
        commentAdminRepository.delete(comment);
    }

    private PostComment findComment(UUID id) {
        return commentAdminRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found: " + id));
    }
}
