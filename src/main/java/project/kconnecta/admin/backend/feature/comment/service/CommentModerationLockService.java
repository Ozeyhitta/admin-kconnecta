package project.kconnecta.admin.backend.feature.comment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.admin.backend.entity.PostComment;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.comment.repository.CommentAdminRepository;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommentModerationLockService {

    static final Duration LOCK_TTL = Duration.ofMinutes(5);

    private final CommentAdminRepository commentAdminRepository;
    private final UserRepository userRepository;

    @Transactional
    public void acquireLock(UUID commentId, UUID adminId) {
        ensurePending(commentId);
        LocalDateTime expiredBefore = LocalDateTime.now().minus(LOCK_TTL);
        int updated = commentAdminRepository.tryAcquireLock(commentId, adminId, expiredBefore);
        if (updated == 1) {
            return;
        }
        throw lockedByOther(commentId);
    }

    @Transactional
    public void renewLock(UUID commentId, UUID adminId) {
        PostComment comment = findComment(commentId);
        if (!"PENDING".equals(comment.getStatus())) {
            return;
        }
        if (isActiveLockHeldBy(comment, adminId)) {
            commentAdminRepository.renewLock(commentId, adminId);
            return;
        }
        acquireLock(commentId, adminId);
    }

    @Transactional
    public void releaseLock(UUID commentId, UUID adminId) {
        commentAdminRepository.releaseLock(commentId, adminId);
    }

    @Transactional
    public void clearLock(UUID commentId) {
        commentAdminRepository.clearLock(commentId);
    }

    /** Ensures the caller holds an active lock before approve/reject. */
    @Transactional
    public void requireLockForAction(UUID commentId, UUID adminId) {
        ensurePending(commentId);
        PostComment comment = findComment(commentId);
        if (isActiveLockHeldBy(comment, adminId)) {
            return;
        }
        LocalDateTime expiredBefore = LocalDateTime.now().minus(LOCK_TTL);
        if (commentAdminRepository.tryAcquireLock(commentId, adminId, expiredBefore) == 1) {
            return;
        }
        throw lockedByOther(commentId);
    }

    public boolean isLockActive(PostComment comment) {
        return comment.getModerationLockedBy() != null
                && comment.getModerationLockedAt() != null
                && comment.getModerationLockedAt().isAfter(LocalDateTime.now().minus(LOCK_TTL));
    }

    public boolean isActiveLockHeldBy(PostComment comment, UUID adminId) {
        if (comment.getModerationLockedBy() == null || comment.getModerationLockedAt() == null) {
            return false;
        }
        if (!comment.getModerationLockedBy().equals(adminId)) {
            return false;
        }
        return comment.getModerationLockedAt().isAfter(LocalDateTime.now().minus(LOCK_TTL));
    }

    public boolean isActiveLockHeldByOther(PostComment comment, UUID viewerAdminId) {
        if (comment.getModerationLockedBy() == null || comment.getModerationLockedAt() == null) {
            return false;
        }
        if (viewerAdminId != null && comment.getModerationLockedBy().equals(viewerAdminId)) {
            return false;
        }
        return comment.getModerationLockedAt().isAfter(LocalDateTime.now().minus(LOCK_TTL));
    }

    private void ensurePending(UUID commentId) {
        PostComment comment = findComment(commentId);
        if (!"PENDING".equals(comment.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bình luận đã được xử lý trước đó");
        }
    }

    private PostComment findComment(UUID commentId) {
        return commentAdminRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found: " + commentId));
    }

    private ResponseStatusException lockedByOther(UUID commentId) {
        PostComment comment = findComment(commentId);
        if (!isLockActive(comment)) {
            return new ResponseStatusException(HttpStatus.CONFLICT, "Không thể giữ khóa duyệt. Vui lòng thử lại.");
        }
        String locker = userRepository.findById(comment.getModerationLockedBy())
                .map(u -> "@" + u.getUsername())
                .orElse("admin khác");
        return new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Bình luận đang được duyệt bởi " + locker + ". Vui lòng chọn bình luận khác.");
    }
}
