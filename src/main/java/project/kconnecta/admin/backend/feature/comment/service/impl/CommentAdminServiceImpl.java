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
import project.kconnecta.admin.backend.common.enums.ViolationSource;
import project.kconnecta.admin.backend.entity.PostComment;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.comment.dto.response.CommentAdminResponse;
import project.kconnecta.admin.backend.feature.comment.repository.CommentAdminRepository;
import project.kconnecta.admin.backend.feature.comment.service.CommentModerationLockService;
import project.kconnecta.admin.backend.feature.moderation.service.ViolationPenaltyService;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentAdminServiceImpl implements CommentAdminService {

    private final CommentAdminRepository commentAdminRepository;
    private final CommentModerationLockService moderationLockService;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ViolationPenaltyService violationPenaltyService;

    @Value("${user-service.url:http://localhost:8080}")
    private String userServiceUrl;

    @Value("${user-service.internal-key:kconnecta-internal-secret}")
    private String internalKey;

    @Override
    public Page<CommentAdminResponse> getComments(int page, int size, String sortBy, String sortDir,
                                                  String search, UUID postId, UUID authorId, String status,
                                                  UUID viewerAdminId) {
        Sort.Direction direction = Sort.Direction.fromString(sortDir.toUpperCase());
        Set<String> validFields = Set.of("createdAt", "updatedAt");
        String safeField = validFields.contains(sortBy) ? sortBy : "createdAt";
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, safeField));

        String pattern = (search != null && !search.isBlank())
                ? "%" + search.trim().toLowerCase(java.util.Locale.ROOT) + "%"
                : null;
        String statusFilter = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : null;

        Page<PostComment> comments = commentAdminRepository
                .findAllFiltered(pattern, postId, authorId, statusFilter, pageable);
        Map<UUID, String> lockerUsernames = resolveLockerUsernames(comments.getContent());
        return comments.map(c -> toResponse(c, viewerAdminId, lockerUsernames));
    }

    @Override
    public CommentAdminResponse getCommentById(UUID id, UUID viewerAdminId) {
        PostComment comment = findComment(id);
        Map<UUID, String> lockerUsernames = resolveLockerUsernames(java.util.List.of(comment));
        return toResponse(comment, viewerAdminId, lockerUsernames);
    }

    @Override
    @Transactional
    public void deleteComment(UUID id) {
        PostComment comment = findComment(id);
        violationPenaltyService.applyForContentViolation(
                comment.getUser().getId(), ViolationSource.COMMENT, comment.getId(), "Bình luận vi phạm (đã xóa)");
        commentAdminRepository.delete(comment);
    }

    @Override
    @Transactional
    public void acquireModerationLock(UUID id, UUID adminId) {
        moderationLockService.acquireLock(id, adminId);
    }

    @Override
    @Transactional
    public void renewModerationLock(UUID id, UUID adminId) {
        moderationLockService.renewLock(id, adminId);
    }

    @Override
    @Transactional
    public void releaseModerationLock(UUID id, UUID adminId) {
        moderationLockService.releaseLock(id, adminId);
    }

    @Override
    @Transactional
    public void approveComment(UUID id, UUID adminId) {
        moderationLockService.requireLockForAction(id, adminId);
        try {
            restTemplate.exchange(
                    userServiceUrl + "/api/internal/comments/" + id + "/approve",
                    HttpMethod.POST,
                    new HttpEntity<>(internalHeaders()),
                    Void.class
            );
        } finally {
            moderationLockService.clearLock(id);
        }
    }

    @Override
    @Transactional
    public void rejectComment(UUID id, String reason, UUID adminId) {
        PostComment comment = findComment(id);
        moderationLockService.requireLockForAction(id, adminId);
        HttpHeaders headers = internalHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> body = Map.of("reason", reason != null ? reason : "");
        try {
            restTemplate.exchange(
                    userServiceUrl + "/api/internal/comments/" + id + "/reject",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Void.class
            );
            violationPenaltyService.applyForContentViolation(
                    comment.getUser().getId(), ViolationSource.COMMENT, comment.getId(),
                    "Bình luận vi phạm" + (reason != null && !reason.isBlank() ? ": " + reason : ""));
        } finally {
            moderationLockService.clearLock(id);
        }
    }

    private Map<UUID, String> resolveLockerUsernames(java.util.List<PostComment> comments) {
        Set<UUID> lockerIds = new HashSet<>();
        for (PostComment comment : comments) {
            if (moderationLockService.isLockActive(comment)) {
                lockerIds.add(comment.getModerationLockedBy());
            }
        }
        if (lockerIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(lockerIds).stream()
                .collect(Collectors.toMap(
                        u -> u.getId(),
                        u -> u.getUsername(),
                        (a, b) -> a,
                        HashMap::new
                ));
    }

    private CommentAdminResponse toResponse(
            PostComment comment,
            UUID viewerAdminId,
            Map<UUID, String> lockerUsernames) {
        return CommentAdminResponse.from(
                comment,
                viewerAdminId,
                lockerUsernames,
                moderationLockService.isLockActive(comment));
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
