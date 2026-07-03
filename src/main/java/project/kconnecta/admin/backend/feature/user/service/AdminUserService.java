package project.kconnecta.admin.backend.feature.user.service;

import org.springframework.data.domain.Page;
import project.kconnecta.admin.backend.common.enums.AccountRole;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.UserActivityLogResponse;
import project.kconnecta.admin.backend.feature.user.dto.response.AdminUserResponseDTO;
import project.kconnecta.admin.backend.feature.user.dto.response.UserStatsResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface AdminUserService {

    Page<AdminUserResponseDTO> getUsers(
            int page, int size, String sortBy, String sortDir,
            String search, AccountStatus status, AccountRole role);

    AdminUserResponseDTO getUserById(UUID id);

    AdminUserResponseDTO getUserByProfileId(UUID profileId);

    List<AdminUserResponseDTO> getUsersByIds(List<UUID> ids);

    AdminUserResponseDTO updateStatus(UUID id, AccountStatus status, Integer lockDays);

    AdminUserResponseDTO resetPassword(UUID id, String newPassword);

    AdminUserResponseDTO resetEmail(UUID id, String newEmail);

    long countUsersRegisteredBetween(LocalDateTime from, LocalDateTime to);

    UserStatsResponse getUserStats(UUID id);

    List<UserActivityLogResponse> getUserActivity(UUID id);

    void sendResetPasswordEmail(UUID id);
}
