package project.kconnecta.admin.backend.feature.report.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.entity.PostReport;

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
}
