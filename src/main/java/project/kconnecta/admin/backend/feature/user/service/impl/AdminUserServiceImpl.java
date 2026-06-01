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
import project.kconnecta.admin.backend.exception.ResourceNotFoundException;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.UserActivityLogResponse;
import project.kconnecta.admin.backend.feature.activitylog.repository.UserActivityLogRepository;
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

    private void assertNotLastAdmin(Account target, AccountRole newRole) {
        if (target.getRole() == AccountRole.ADMIN && newRole != AccountRole.ADMIN) {
            if (accountRepository.countByRole(AccountRole.ADMIN) <= 1) {
                throw new IllegalArgumentException("Không thể gỡ quyền Admin cuối cùng trong hệ thống");
            }
        }
    }

    @Override
    @Transactional
    public AdminUserResponseDTO updateStatus(UUID id, AccountStatus status) {
        Account account = findAccount(id);
        assertCanModifyUser(account);
        account.setStatus(status);
        return AdminUserResponseDTO.from(accountRepository.saveAndFlush(account));
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
    @Transactional
    public AdminUserResponseDTO updateRole(UUID id, AccountRole role) {
        Account account = findAccount(id);
        assertCanModifyUser(account);
        assertNotLastAdmin(account, role);
        account.setRole(role);
        return AdminUserResponseDTO.from(accountRepository.save(account));
    }

    @Override
    public long countUsersRegisteredBetween(LocalDateTime from, LocalDateTime to) {
        return accountRepository.countByCreatedAtBetween(from, to);
    }

    @Override
    public UserStatsResponse getUserStats(UUID id) {
        findAccount(id);
        return UserStatsResponse.builder()
                .totalPosts(postAdminRepository.countByAuthorId(id))
                .totalComments(commentAdminRepository.countByUserId(id))
                .totalReactions(activityLogRepository.countByUserIdAndActionType(id, "REACTION_ADDED"))
                .totalShares(activityLogRepository.countByUserIdAndActionType(id, "POST_SHARED"))
                .totalFriendRequests(activityLogRepository.countByUserIdAndActionType(id, "FRIEND_REQUEST_SENT"))
                .totalLogins(activityLogRepository.countByUserIdAndActionType(id, "LOGIN"))
                .totalActivity(activityLogRepository.countByUserId(id))
                .build();
    }

    @Override
    public List<UserActivityLogResponse> getUserActivity(UUID id) {
        findAccount(id);
        return activityLogRepository.findTop15ByUserIdOrderByCreatedAtDesc(id).stream()
                .map(UserActivityLogResponse::from)
                .toList();
    }

    private Account findAccount(UUID id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }
}
