package project.kconnecta.admin.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.admin.backend.common.enums.AccountRole;
import project.kconnecta.admin.backend.common.enums.AccountStatus;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "accounts", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountStatus status;

    // New column — defaults to USER so existing rows are unaffected
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, columnDefinition = "VARCHAR(10) DEFAULT 'USER'")
    @Builder.Default
    private AccountRole role = AccountRole.USER;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "lock_reason", length = 255)
    private String lockReason;

    @OneToOne(mappedBy = "account")
    private User user;
}
