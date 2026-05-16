package project.kconnecta.admin.backend.feature.comment.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.entity.PostComment;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommentAdminRepository extends JpaRepository<PostComment, UUID> {

    @Query(value =
            "SELECT c FROM PostComment c LEFT JOIN FETCH c.user LEFT JOIN FETCH c.post " +
            "WHERE (:pattern IS NULL OR LOWER(c.content) LIKE :pattern) " +
            "  AND (:postId IS NULL OR c.post.id = :postId) " +
            "  AND (:authorId IS NULL OR c.user.id = :authorId)",
           countQuery =
            "SELECT COUNT(c) FROM PostComment c " +
            "WHERE (:pattern IS NULL OR LOWER(c.content) LIKE :pattern) " +
            "  AND (:postId IS NULL OR c.post.id = :postId) " +
            "  AND (:authorId IS NULL OR c.user.id = :authorId)")
    Page<PostComment> findAllFiltered(
            @Param("pattern") String pattern,
            @Param("postId") UUID postId,
            @Param("authorId") UUID authorId,
            Pageable pageable);

    @Query("SELECT c FROM PostComment c LEFT JOIN FETCH c.user LEFT JOIN FETCH c.post WHERE c.id = :id")
    Optional<PostComment> findByIdWithDetails(@Param("id") UUID id);

    long countByUserId(UUID userId);
}
