package project.kconnecta.admin.backend.feature.report.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.entity.PostReport;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostReportAdminRepository extends JpaRepository<PostReport, UUID> {
    @Query(value =
            "SELECT r FROM PostReport r " +
            "LEFT JOIN FETCH r.post p " +
            "LEFT JOIN FETCH p.author " +
            "LEFT JOIN FETCH r.reporter reporter " +
            "WHERE (:pattern IS NULL " +
            "  OR LOWER(COALESCE(r.reason, '')) LIKE :pattern " +
            "  OR LOWER(COALESCE(p.content, '')) LIKE :pattern " +
            "  OR LOWER(COALESCE(reporter.fullName, '')) LIKE :pattern " +
            "  OR LOWER(COALESCE(reporter.username, '')) LIKE :pattern) " +
            "  AND (:postId IS NULL OR p.id = :postId)",
           countQuery =
            "SELECT COUNT(r) FROM PostReport r " +
            "LEFT JOIN r.post p " +
            "LEFT JOIN r.reporter reporter " +
            "WHERE (:pattern IS NULL " +
            "  OR LOWER(COALESCE(r.reason, '')) LIKE :pattern " +
            "  OR LOWER(COALESCE(p.content, '')) LIKE :pattern " +
            "  OR LOWER(COALESCE(reporter.fullName, '')) LIKE :pattern " +
            "  OR LOWER(COALESCE(reporter.username, '')) LIKE :pattern) " +
            "  AND (:postId IS NULL OR p.id = :postId)")
    Page<PostReport> findAllFiltered(
            @Param("pattern") String pattern,
            @Param("postId") UUID postId,
            Pageable pageable);

    @Query("SELECT r FROM PostReport r LEFT JOIN FETCH r.post p LEFT JOIN FETCH p.author LEFT JOIN FETCH r.reporter WHERE r.id = :id")
    Optional<PostReport> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT r FROM PostReport r LEFT JOIN FETCH r.post LEFT JOIN FETCH r.reporter")
    List<PostReport> findAllWithDetails();

    long countByPost_Id(UUID postId);

    long countByCreatedAtAfter(LocalDateTime createdAt);

    @Query("SELECT r.post.id AS postId, COUNT(r) AS reportCount FROM PostReport r WHERE r.post.id IN :postIds GROUP BY r.post.id")
    List<PostReportCountView> countByPostIds(@Param("postIds") Collection<UUID> postIds);

    @Query(value =
            "SELECT DISTINCT ON (post_id) post_id AS postId, category AS category, reason AS reason " +
            "FROM post_reports " +
            "WHERE post_id IN (:postIds) " +
            "ORDER BY post_id, created_at DESC",
            nativeQuery = true)
    List<LatestPostReportView> findLatestByPostIds(@Param("postIds") Collection<UUID> postIds);

    interface PostReportCountView {
        UUID getPostId();
        long getReportCount();
    }

    interface LatestPostReportView {
        UUID getPostId();
        String getCategory();
        String getReason();
    }
}
