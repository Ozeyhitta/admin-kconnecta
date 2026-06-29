package project.kconnecta.admin.backend.feature.support.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.entity.SupportRequest;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupportRequestAdminRepository extends JpaRepository<SupportRequest, UUID> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SupportRequest s SET s.status = 'IN_PROGRESS' WHERE s.status = 'PENDING'")
    int promotePendingToInProgress();

    @Query(value =
            "SELECT s FROM SupportRequest s LEFT JOIN FETCH s.user u LEFT JOIN FETCH u.account " +
            "WHERE (:pattern IS NULL OR LOWER(s.subject) LIKE :pattern OR LOWER(s.message) LIKE :pattern) " +
            "  AND (:category IS NULL OR s.category = :category) " +
            "  AND (:status IS NULL OR s.status = :status)",
           countQuery =
            "SELECT COUNT(s) FROM SupportRequest s " +
            "WHERE (:pattern IS NULL OR LOWER(s.subject) LIKE :pattern OR LOWER(s.message) LIKE :pattern) " +
            "  AND (:category IS NULL OR s.category = :category) " +
            "  AND (:status IS NULL OR s.status = :status)")
    Page<SupportRequest> findAllFiltered(
            @Param("pattern") String pattern,
            @Param("category") String category,
            @Param("status") String status,
            Pageable pageable);

    @Query("SELECT s FROM SupportRequest s LEFT JOIN FETCH s.user u LEFT JOIN FETCH u.account WHERE s.id = :id")
    Optional<SupportRequest> findByIdWithDetails(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SupportRequest s LEFT JOIN FETCH s.user u LEFT JOIN FETCH u.account WHERE s.id = :id")
    Optional<SupportRequest> findByIdWithDetailsForUpdate(@Param("id") UUID id);

    long countByStatus(String status);
}
