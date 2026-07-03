package project.kconnecta.admin.backend.feature.user.service.impl;

import project.kconnecta.admin.backend.feature.user.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.common.enums.AccountRole;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.config.security.AdminPrincipal;
import project.kconnecta.admin.backend.entity.Account;
import project.kconnecta.admin.backend.entity.User;
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.UserActivityLogResponse;
import project.kconnecta.admin.backend.feature.activitylog.repository.UserActivityLogRepository;
import project.kconnecta.admin.backend.feature.activitylog.service.ActivityLogWriterService;
import project.kconnecta.admin.backend.integration.UserBackendSessionClient;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;
import project.kconnecta.admin.backend.feature.comment.repository.CommentAdminRepository;
import project.kconnecta.admin.backend.feature.post.repository.PostAdminRepository;
import project.kconnecta.admin.backend.feature.user.dto.response.AdminUserResponseDTO;
import project.kconnecta.admin.backend.feature.user.dto.response.UserStatsResponse;
import project.kconnecta.admin.backend.feature.user.repository.AccountRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final AccountRepository accountRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final PostAdminRepository postAdminRepository;
    private final CommentAdminRepository commentAdminRepository;
    private final UserActivityLogRepository activityLogRepository;
    private final ActivityLogWriterService activityLogWriter;
    private final UserRepository userRepository;
    private final UserBackendSessionClient userBackendSessionClient;

    @Override
    public Page<AdminUserResponseDTO> getUsers(int page, int size, String sortBy, String sortDir,
                                               String search, AccountStatus status, AccountRole role) {
        Sort.Direction direction = Sort.Direction.fromString(sortDir.toUpperCase());
        Set<String> validFields = Set.of("id", "email", "status", "role", "createdAt");
        String safeField = validFields.contains(sortBy) ? sortBy : "createdAt";
        Sort sort = Sort.by(direction, safeField);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Account> accounts;
        if (search != null && !search.isBlank()) {
            accounts = accountRepository.searchByEmailOrUsername(search.trim(), pageable);
        } else if (status != null && role != null) {
            accounts = accountRepository.findByStatusAndRole(status, role, pageable);
        } else if (status != null) {
            accounts = accountRepository.findByStatus(status, pageable);
        } else if (role != null) {
            accounts = accountRepository.findByRole(role, pageable);
        } else {
            accounts = accountRepository.findAll(pageable);
        }

        return accounts.map(AdminUserResponseDTO::from);
    }

    @Override
    public AdminUserResponseDTO getUserById(UUID id) {
        return AdminUserResponseDTO.from(findAccount(id));
    }

    @Override
    public AdminUserResponseDTO getUserByProfileId(UUID profileId) {
        User user = userRepository.findById(profileId)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found: " + profileId));
        return AdminUserResponseDTO.from(user.getAccount());
    }

    @Override
    public List<AdminUserResponseDTO> getUsersByIds(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return accountRepository.findAllById(ids).stream()
                .map(AdminUserResponseDTO::from)
                .toList();
    }

    private UUID currentAdminId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AdminPrincipal principal)) {
            throw new IllegalStateException("Unauthorized");
        }
        return principal.getUserId();
    }

    private void assertCanModifyUser(Account target) {
        if (currentAdminId().equals(target.getId())) {
            throw new IllegalArgumentException("Không thể thay đổi tài khoản của chính bạn");
        }
    }

    @Override
    @Transactional
    public AdminUserResponseDTO updateStatus(UUID id, AccountStatus status, Integer lockDays) {
        Account account = findAccount(id);
        assertCanModifyUser(account);
        account.setStatus(status);
        if (status == AccountStatus.BLOCKED && lockDays != null && lockDays >= 1) {
            account.setLockedUntil(LocalDateTime.now().plusDays(lockDays));
            account.setLockReason("Tài khoản bị quản trị viên khóa tạm thời " + lockDays + " ngày sau khi xem xét.");
        } else if (status == AccountStatus.BLOCKED) {
            account.setLockedUntil(null);
            account.setLockReason("Tài khoản bị quản trị viên khóa sau khi xem xét.");
        } else {
            account.setLockedUntil(null);
            account.setLockReason(null);
        }
        Account saved = accountRepository.saveAndFlush(account);
        if (status != AccountStatus.ACTIVE) {
            userRepository.findByAccount_Id(saved.getId())
                    .ifPresent(user -> userBackendSessionClient.revokeAllSessions(user.getId()));
        }
        if (status == AccountStatus.BLOCKED) {
            userRepository.findByAccount_Id(saved.getId()).ifPresent(user ->
                    activityLogWriter.log(
                            user.getId(),
                            user.getUsername(),
                            "ACCOUNT_LOCKED",
                            buildAdminLockMetadata(lockDays, saved.getLockReason())
                    ));
        }
        return AdminUserResponseDTO.from(saved);
    }

    private static String buildAdminLockMetadata(Integer lockDays, String lockReason) {
        String reason = lockReason != null && !lockReason.isBlank()
                ? lockReason.replace("\"", "\\\"")
                : "Admin khóa tài khoản";
        if (lockDays != null && lockDays >= 1) {
            return "{\"reason\":\"" + reason + "\",\"lockDays\":" + lockDays + ",\"source\":\"admin\"}";
        }
        return "{\"reason\":\"" + reason + "\",\"source\":\"admin\"}";
    }

    @Override
    @Transactional
    public AdminUserResponseDTO resetPassword(UUID id, String newPassword) {
        Account account = findAccount(id);
        assertCanModifyUser(account);
        account.setPasswordHash(passwordEncoder.encode(newPassword));
        return AdminUserResponseDTO.from(accountRepository.save(account));
    }

    @Override
    @Transactional
    public AdminUserResponseDTO resetEmail(UUID id, String newEmail) {
        Account account = findAccount(id);
        assertCanModifyUser(account);

        String normalized = newEmail.trim().toLowerCase();
        accountRepository.findByEmail(normalized)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Email đã được sử dụng");
                });

        account.setEmail(normalized);
        return AdminUserResponseDTO.from(accountRepository.save(account));
    }


    @Override
    public long countUsersRegisteredBetween(LocalDateTime from, LocalDateTime to) {
        return accountRepository.countByCreatedAtBetween(from, to);
    }

    @Override
    public UserStatsResponse getUserStats(UUID id) {
        Account account = findAccount(id);
        UUID userId = resolveUserId(account);
        if (userId == null) {
            return UserStatsResponse.builder().build();
        }
        return UserStatsResponse.builder()
                .totalPosts(postAdminRepository.countByAuthorId(userId))
                .totalComments(commentAdminRepository.countByUserId(userId))
                .totalReactions(activityLogRepository.countByUserIdAndActionType(userId, "REACTION_ADDED"))
                .totalShares(activityLogRepository.countByUserIdAndActionType(userId, "POST_SHARED"))
                .totalFriendRequests(activityLogRepository.countByUserIdAndActionType(userId, "FRIEND_REQUEST_SENT"))
                .totalLogins(activityLogRepository.countByUserIdAndActionType(userId, "LOGIN"))
                .totalActivity(activityLogRepository.countByUserId(userId))
                .build();
    }

    @Override
    public List<UserActivityLogResponse> getUserActivity(UUID id) {
        Account account = findAccount(id);
        UUID userId = resolveUserId(account);
        if (userId == null) {
            return List.of();
        }
        return activityLogRepository.findTop15ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(UserActivityLogResponse::from)
                .toList();
    }

    /**
     * The customers resource is keyed by account id, but posts/comments/activity logs
     * are keyed by user id (users.account_id links the two). Translate before counting.
     */
    private UUID resolveUserId(Account account) {
        return userRepository.findByAccount_Id(account.getId())
                .map(User::getId)
                .orElse(null);
    }

    private Account findAccount(UUID id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    @Override
    public void sendResetPasswordEmail(UUID id) {
        Account account = findAccount(id);
        UUID userId = resolveUserId(account);
        if (userId == null) {
            throw new ResourceNotFoundException("User profile not found for account: " + id);
        }
        userBackendSessionClient.sendResetPasswordEmail(userId);
    }
}
