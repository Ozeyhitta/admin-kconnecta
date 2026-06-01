package project.kconnecta.admin.backend.feature.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.admin.backend.entity.User;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Query(value = "SELECT COUNT(*) FROM users WHERE last_active_at >= :since", nativeQuery = true)
    long countOnlineSince(@Param("since") LocalDateTime since);

    Optional<User> findByAccount_Id(UUID accountId);

    Optional<User> findByUsername(String username);
}
