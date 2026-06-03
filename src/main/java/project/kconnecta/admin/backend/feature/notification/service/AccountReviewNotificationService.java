package project.kconnecta.admin.backend.feature.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.common.enums.AlertStatus;
import project.kconnecta.admin.backend.common.enums.AlertType;
import project.kconnecta.admin.backend.entity.UserActivityLog;
import project.kconnecta.admin.backend.entity.User;
import project.kconnecta.admin.backend.feature.activitylog.repository.UserActivityLogRepository;
import project.kconnecta.admin.backend.feature.moderation.entity.AdminAlert;
import project.kconnecta.admin.backend.feature.moderation.service.AdminAlertService;
import project.kconnecta.admin.backend.feature.notification.dto.response.AccountReviewRequestResponse;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountReviewNotificationService {

    private static final String ACCOUNT_REVIEW_ACTION = "ACCOUNT_REVIEW_REQUESTED";

    private final AdminAlertService adminAlertService;
    private final UserRepository userRepository;
    private final UserActivityLogRepository activityLogRepository;

    @Transactional(readOnly = true)
    public List<AccountReviewRequestResponse> listNewRequests(int size) {
        List<UserActivityLog> logs = activityLogRepository.findByActionTypeOrderByCreatedAtDesc(
                ACCOUNT_REVIEW_ACTION,
                PageRequest.of(0, Math.max(1, size)));
        if (!logs.isEmpty()) {
            Map<UUID, User> usersById = loadUsersFromLogs(logs);
            return logs.stream()
                    .map(log -> toResponse(log, usersById.get(log.getUserId())))
                    .toList();
        }

        Page<AdminAlert> page = adminAlertService.findAlerts(
                AlertStatus.NEW, AlertType.ACCOUNT_REVIEW_REQUESTED, 0, size);
        Map<UUID, User> usersById = loadUsers(page.getContent());
        return page.getContent().stream()
                .map(alert -> toResponse(alert, usersById.get(alert.getUserId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public long countNewRequests() {
        long logCount = activityLogRepository.countByActionType(ACCOUNT_REVIEW_ACTION);
        return logCount > 0 ? logCount : adminAlertService.countNewAccountReviewRequests();
    }

    private Map<UUID, User> loadUsers(List<AdminAlert> alerts) {
        Set<UUID> ids = alerts.stream()
                .map(AdminAlert::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private Map<UUID, User> loadUsersFromLogs(List<UserActivityLog> logs) {
        Set<UUID> ids = logs.stream()
                .map(UserActivityLog::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private AccountReviewRequestResponse toResponse(AdminAlert alert, User user) {
        return AccountReviewRequestResponse.builder()
                .id(alert.getId())
                .userId(user != null ? user.getAccount().getId() : alert.getUserId())
                .username(user != null ? user.getUsername() : null)
                .fullName(user != null ? user.getFullName() : null)
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .description(alert.getDescription())
                .createdAt(alert.getCreatedAt())
                .build();
    }

    private AccountReviewRequestResponse toResponse(UserActivityLog log, User user) {
        return AccountReviewRequestResponse.builder()
                .id(log.getId())
                .userId(user != null ? user.getAccount().getId() : log.getUserId())
                .username(user != null ? user.getUsername() : log.getUsername())
                .fullName(user != null ? user.getFullName() : null)
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .description(resolveReason(log.getMetadata()))
                .createdAt(log.getCreatedAt())
                .build();
    }

    private String resolveReason(String metadata) {
        if (metadata == null || metadata.isBlank()) {
            return "Nguoi dung yeu cau admin xem xet mo khoa tai khoan.";
        }
        String marker = "\"reason\":\"";
        int start = metadata.indexOf(marker);
        if (start >= 0) {
            int valueStart = start + marker.length();
            StringBuilder value = new StringBuilder();
            boolean escaping = false;
            for (int i = valueStart; i < metadata.length(); i++) {
                char current = metadata.charAt(i);
                if (escaping) {
                    value.append(current);
                    escaping = false;
                    continue;
                }
                if (current == '\\') {
                    escaping = true;
                    continue;
                }
                if (current == '"') {
                    String text = value.toString().trim();
                    if (!text.isBlank()) {
                        return text;
                    }
                    break;
                }
                value.append(current);
            }
        }
        return metadata;
    }
}
