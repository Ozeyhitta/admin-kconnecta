package project.kconnecta.admin.backend.feature.comment.service.impl;

import project.kconnecta.admin.backend.feature.comment.service.CommentAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import project.kconnecta.admin.backend.entity.PostComment;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.comment.dto.response.CommentAdminResponse;
import project.kconnecta.admin.backend.feature.comment.repository.CommentAdminRepository;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommentAdminServiceImpl implements CommentAdminService {

    private final CommentAdminRepository commentAdminRepository;
    private final RestTemplate restTemplate;

    @Value("${user-service.url:http://localhost:8080}")
    private String userServiceUrl;

    @Value("${user-service.internal-key:kconnecta-internal-secret}")
    private String internalKey;

    @Override
    public Page<CommentAdminResponse> getComments(int page, int size, String sortBy, String sortDir,
                                                  String search, UUID postId, UUID authorId, String status) {
        Sort.Direction direction = Sort.Direction.fromString(sortDir.toUpperCase());
        Set<String> validFields = Set.of("createdAt", "updatedAt");
        String safeField = validFields.contains(sortBy) ? sortBy : "createdAt";
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, safeField));

        String pattern = (search != null && !search.isBlank())
                ? "%" + search.trim().toLowerCase(java.util.Locale.ROOT) + "%"
                : null;
        String statusFilter = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : null;

        return commentAdminRepository
                .findAllFiltered(pattern, postId, authorId, statusFilter, pageable)
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

    @Override
    public void approveComment(UUID id) {
        restTemplate.exchange(
                userServiceUrl + "/api/internal/comments/" + id + "/approve",
                HttpMethod.POST,
                new HttpEntity<>(internalHeaders()),
                Void.class
        );
    }

    @Override
    public void rejectComment(UUID id, String reason) {
        HttpHeaders headers = internalHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> body = Map.of("reason", reason != null ? reason : "");
        restTemplate.exchange(
                userServiceUrl + "/api/internal/comments/" + id + "/reject",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Void.class
        );
    }

    private HttpHeaders internalHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Internal-Key", internalKey);
        return headers;
    }

    private PostComment findComment(UUID id) {
        return commentAdminRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found: " + id));
    }
}
