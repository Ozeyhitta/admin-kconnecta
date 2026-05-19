package project.kconnecta.admin.backend.feature.user.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.admin.backend.common.enums.AccountRole;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.entity.Account;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class AdminUserResponseDTO {

    private UUID id;
    private String email;
    private AccountStatus status;
    private AccountRole role;
    private LocalDateTime createdAt;
    private String username;
    private String fullName;
    private String avatarUrl;
    private LocalDateTime lastActiveAt;

    public static AdminUserResponseDTO from(Account account) {
        var user = account.getUser();
        return AdminUserResponseDTO.builder()
                .id(account.getId())
                .email(account.getEmail())
                .status(account.getStatus())
                .role(account.getRole())
                .createdAt(account.getCreatedAt())
                .username(user != null ? user.getUsername() : null)
                .fullName(user != null ? user.getFullName() : null)
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .lastActiveAt(user != null ? user.getLastActiveAt() : null)
                .build();
    }
}
