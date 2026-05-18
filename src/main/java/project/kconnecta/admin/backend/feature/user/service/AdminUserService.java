package project.kconnecta.admin.backend.feature.user.service;

import org.springframework.data.domain.Page;
import project.kconnecta.admin.backend.common.enums.AccountRole;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.feature.user.dto.response.AdminUserResponseDTO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface AdminUserService {

    Page<AdminUserResponseDTO> getUsers(int page, int size, String sortBy, String sortDir,
                                        String search, AccountStatus status, AccountRole role);

    AdminUserResponseDTO getUserById(UUID id);

    List<AdminUserResponseDTO> getUsersByIds(List<UUID> ids);

    AdminUserResponseDTO updateStatus(UUID id, AccountStatus status);

    AdminUserResponseDTO resetPassword(UUID id, String newPassword);

    AdminUserResponseDTO updateRole(UUID id, AccountRole role);

    long countUsersRegisteredBetween(LocalDateTime from, LocalDateTime to);
}
