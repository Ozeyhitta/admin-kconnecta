package project.kconnecta.admin.backend.feature.user.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.admin.backend.common.enums.AccountRole;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.entity.Account;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {

    Optional<Account> findByEmail(String email);

    @Query("""
            SELECT a FROM Account a LEFT JOIN a.user u
            WHERE LOWER(a.email) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%'))
            """)
    Page<Account> searchByEmailOrUsername(@Param("q") String query, Pageable pageable);

    Page<Account> findByStatus(AccountStatus status, Pageable pageable);

    Page<Account> findByRole(AccountRole role, Pageable pageable);

    Page<Account> findByStatusAndRole(AccountStatus status, AccountRole role, Pageable pageable);

    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);
}
