package project.kconnecta.admin.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.admin.backend.entity.PostMedia;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface PostMediaAdminRepository extends JpaRepository<PostMedia, UUID> {

    List<PostMedia> findByPostIdInOrderByPostIdAscSortOrderAsc(Collection<UUID> postIds);

    List<PostMedia> findByPostIdOrderBySortOrderAsc(UUID postId);

    @Modifying
    @Query("DELETE FROM PostMedia media WHERE media.postId = :postId")
    int deleteByPostId(@Param("postId") UUID postId);
}
