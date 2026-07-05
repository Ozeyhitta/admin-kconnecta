package project.kconnecta.admin.backend.feature.comment.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.entity.PostComment;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommentAdminRepository extends JpaRepository<PostComment, UUID> {

    @Query(value =
            "SELECT c FROM PostComment c LEFT JOIN FETCH c.user LEFT JOIN FETCH c.post " +
            "WHERE (:pattern IS NULL OR LOWER(c.content) LIKE :pattern) " +
            "  AND (:postId IS NULL OR c.post.id = :postId) " +
            "  AND (:authorId IS NULL OR c.user.id = :authorId) " +
            "  AND (:status IS NULL OR c.status = :status)",
           countQuery =
            "SELECT COUNT(c) FROM PostComment c " +
            "WHERE (:pattern IS NULL OR LOWER(c.content) LIKE :pattern) " +
            "  AND (:postId IS NULL OR c.post.id = :postId) " +
            "  AND (:authorId IS NULL OR c.user.id = :authorId) " +
            "  AND (:status IS NULL OR c.status = :status)")
    Page<PostComment> findAllFiltered(
            @Param("pattern") String pattern,
            @Param("postId") UUID postId,
            @Param("authorId") UUID authorId,
            @Param("status") String status,
            Pageable pageable);

    @Query("SELECT c FROM PostComment c LEFT JOIN FETCH c.user LEFT JOIN FETCH c.post WHERE c.id = :id")
    Optional<PostComment> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT c FROM PostComment c LEFT JOIN FETCH c.user LEFT JOIN FETCH c.post")
    List<PostComment> findAllWithDetails();

    long countByUserId(UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE post_comments
            SET moderation_locked_by = :adminId,
                moderation_locked_at = CURRENT_TIMESTAMP
            WHERE id = :commentId
              AND status = 'PENDING'
              AND (
                moderation_locked_by IS NULL
                OR moderation_locked_by = :adminId
                OR moderation_locked_at < :expiredBefore
              )
            """, nativeQuery = true)
    int tryAcquireLock(
            @Param("commentId") UUID commentId,
            @Param("adminId") UUID adminId,
            @Param("expiredBefore") LocalDateTime expiredBefore);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE post_comments
            SET moderation_locked_at = CURRENT_TIMESTAMP
            WHERE id = :commentId
              AND status = 'PENDING'
              AND moderation_locked_by = :adminId
            """, nativeQuery = true)
    int renewLock(@Param("commentId") UUID commentId, @Param("adminId") UUID adminId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE post_comments
            SET moderation_locked_by = NULL,
                moderation_locked_at = NULL
            WHERE id = :commentId
              AND moderation_locked_by = :adminId
            """, nativeQuery = true)
    int releaseLock(@Param("commentId") UUID commentId, @Param("adminId") UUID adminId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE post_comments
            SET moderation_locked_by = NULL,
                moderation_locked_at = NULL
            WHERE id = :commentId
            """, nativeQuery = true)
    int clearLock(@Param("commentId") UUID commentId);
}
