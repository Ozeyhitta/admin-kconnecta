package project.kconnecta.admin.backend.feature.post.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.common.enums.PostStatus;
import project.kconnecta.admin.backend.entity.PostShare;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostShareAdminRepository extends JpaRepository<PostShare, UUID> {

    /**
     * Shares joined to their original post. Search matches the share caption OR the
     * original content; status filters by the ORIGINAL post's status (a share inherits it).
     */
    @Query(value =
            "SELECT s FROM PostShare s " +
            "JOIN FETCH s.sharer " +
            "JOIN FETCH s.post op " +
            "JOIN FETCH op.author " +
            "WHERE (:pattern IS NULL OR LOWER(COALESCE(s.sharedContent, '')) LIKE :pattern OR LOWER(COALESCE(op.content, '')) LIKE :pattern) " +
            "  AND (:status IS NULL OR op.status = :status) " +
            "  AND (:sharerId IS NULL OR s.sharer.id = :sharerId) " +
            "  AND (CAST(:createdFrom AS LocalDateTime) IS NULL OR s.createdAt >= :createdFrom) " +
            "  AND (CAST(:createdToExclusive AS LocalDateTime) IS NULL OR s.createdAt < :createdToExclusive)",
           countQuery =
            "SELECT COUNT(s) FROM PostShare s JOIN s.post op " +
            "WHERE (:pattern IS NULL OR LOWER(COALESCE(s.sharedContent, '')) LIKE :pattern OR LOWER(COALESCE(op.content, '')) LIKE :pattern) " +
            "  AND (:status IS NULL OR op.status = :status) " +
            "  AND (:sharerId IS NULL OR s.sharer.id = :sharerId) " +
            "  AND (CAST(:createdFrom AS LocalDateTime) IS NULL OR s.createdAt >= :createdFrom) " +
            "  AND (CAST(:createdToExclusive AS LocalDateTime) IS NULL OR s.createdAt < :createdToExclusive)")
    Page<PostShare> findAllFiltered(
            @Param("pattern") String pattern,
            @Param("status") PostStatus status,
            @Param("sharerId") UUID sharerId,
            @Param("createdFrom") LocalDateTime createdFrom,
            @Param("createdToExclusive") LocalDateTime createdToExclusive,
            Pageable pageable);

    @Query("SELECT s FROM PostShare s JOIN FETCH s.sharer JOIN FETCH s.post op JOIN FETCH op.author WHERE s.id = :id")
    Optional<PostShare> findByIdWithDetails(@Param("id") UUID id);

    /** Re-shares pointing at this share must be detached before it can be removed. */
    @Modifying
    @Query(value = "UPDATE post_shares SET parent_share_id = NULL WHERE parent_share_id = :id", nativeQuery = true)
    int detachChildren(@Param("id") UUID id);

    /** Comments that were written on this specific share (post_comments.share_id). */
    @Modifying
    @Query(value = "DELETE FROM post_comments WHERE share_id = :id", nativeQuery = true)
    int deleteCommentsByShareId(@Param("id") UUID id);
}
