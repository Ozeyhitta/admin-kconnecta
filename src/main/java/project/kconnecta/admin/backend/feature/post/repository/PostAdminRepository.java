package project.kconnecta.admin.backend.feature.post.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.common.enums.PostStatus;
import project.kconnecta.admin.backend.entity.Post;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostAdminRepository extends JpaRepository<Post, UUID> {

    @Query(value =
            "SELECT p FROM Post p LEFT JOIN FETCH p.author " +
            "WHERE (:pattern IS NULL OR LOWER(p.content) LIKE :pattern) " +
            "  AND (:status IS NULL OR p.status = :status) " +
            "  AND (:authorId IS NULL OR p.author.id = :authorId)",
           countQuery =
            "SELECT COUNT(p) FROM Post p " +
            "WHERE (:pattern IS NULL OR LOWER(p.content) LIKE :pattern) " +
            "  AND (:status IS NULL OR p.status = :status) " +
            "  AND (:authorId IS NULL OR p.author.id = :authorId)")
    Page<Post> findAllFiltered(
            @Param("pattern") String pattern,
            @Param("status") PostStatus status,
            @Param("authorId") UUID authorId,
            Pageable pageable);

    @Query("SELECT p FROM Post p LEFT JOIN FETCH p.author WHERE p.id = :id")
    Optional<Post> findByIdWithAuthor(@Param("id") UUID id);

    long countByAuthorId(UUID authorId);

    @Query(value = "SELECT COUNT(*) FROM post_reactions WHERE post_id = :postId", nativeQuery = true)
    long countReactionsByPostId(@Param("postId") UUID postId);

    @Query(value = "SELECT COUNT(*) FROM post_shares WHERE post_id = :postId", nativeQuery = true)
    long countSharesByPostId(@Param("postId") UUID postId);

    @Query(value = "SELECT COUNT(*) FROM post_comments WHERE post_id = :postId AND is_deleted = false", nativeQuery = true)
    long countCommentsByPostId(@Param("postId") UUID postId);

    @Modifying
    @Query(value = "DELETE FROM post_reports WHERE post_id = :postId", nativeQuery = true)
    int deleteReportsByPostId(@Param("postId") UUID postId);

    @Modifying
    @Query(value = "DELETE FROM post_reactions WHERE post_id = :postId", nativeQuery = true)
    int deleteReactionsByPostId(@Param("postId") UUID postId);

    @Modifying
    @Query(value = "DELETE FROM post_shares WHERE post_id = :postId", nativeQuery = true)
    int deleteSharesByPostId(@Param("postId") UUID postId);

    @Modifying
    @Query(value = "DELETE FROM post_comments WHERE post_id = :postId", nativeQuery = true)
    int deleteCommentsByPostId(@Param("postId") UUID postId);
}
