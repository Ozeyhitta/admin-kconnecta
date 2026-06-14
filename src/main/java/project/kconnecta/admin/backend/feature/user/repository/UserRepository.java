package project.kconnecta.admin.backend.feature.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.admin.backend.entity.User;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Query(value = """
            SELECT COUNT(DISTINCT u.id)
            FROM public.users u
            WHERE u.last_active_at >= :since
               OR EXISTS (
                    SELECT 1
                    FROM public.user_activity_logs l
                    WHERE l.user_id = u.id
                      AND l.created_at >= :since
               )
            """, nativeQuery = true)
    long countOnlineSince(@Param("since") LocalDateTime since);

    Optional<User> findByAccount_Id(UUID accountId);

    Optional<User> findByUsername(String username);
}
