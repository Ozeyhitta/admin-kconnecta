package project.kconnecta.admin.backend.feature.activitylog.service.impl;

import project.kconnecta.admin.backend.feature.activitylog.service.ActivityLogAdminService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.entity.User;
import project.kconnecta.admin.backend.entity.UserActivityLog;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.ActivityLogItemResponse;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.ActivityLogPageResponse;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.ActivityLogPaginationResponse;
import project.kconnecta.admin.backend.feature.activitylog.dto.response.ActivityLogSummaryResponse;
import project.kconnecta.admin.backend.feature.activitylog.repository.UserActivityLogRepository;
import project.kconnecta.admin.backend.feature.activitylog.support.ActivityLogMapper;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActivityLogAdminServiceImpl implements ActivityLogAdminService {

    private static final Set<String> VALID_SORT_FIELDS = Set.of("createdAt", "username", "actionType", "status", "severity");
    private static final int EXPORT_LIMIT = 5000;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final UserActivityLogRepository repository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public ActivityLogPageResponse getLogs(
            int page,
            int size,
            String sortBy,
            String sortDir,
            UUID userId,
            String username,
            String actionType,
            String status,
            String severity,
            LocalDateTime from,
            LocalDateTime to,
            boolean abnormalOnly
    ) {
        Sort.Direction direction = Sort.Direction.fromString(sortDir.toUpperCase());
        String safeSort = VALID_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, safeSort));

        Specification<UserActivityLog> spec = buildSpec(userId, username, actionType, status, severity, from, to);
        Page<UserActivityLog> rawPage = repository.findAll(spec, pageable);

        Map<UUID, User> usersById = loadUsers(rawPage.getContent());
        List<ActivityLogItemResponse> items = rawPage.getContent().stream()
                .map(log -> toItem(log, usersById))
                .filter(item -> !abnormalOnly || item.isAbnormal())
                .toList();

        // When abnormalOnly filters post-page, total may be approximate; re-fetch not needed for dashboard.
        ActivityLogSummaryResponse summary = buildSummary(from, to);

        ActivityLogPaginationResponse pagination = ActivityLogPaginationResponse.builder()
                .page(rawPage.getNumber())
                .size(rawPage.getSize())
                .totalElements(abnormalOnly ? items.size() : rawPage.getTotalElements())
                .totalPages(abnormalOnly ? 1 : rawPage.getTotalPages())
                .build();

        return ActivityLogPageResponse.builder()
                .items(items)
                .pagination(pagination)
                .summary(summary)
                .content(items)
                .page(pagination.getPage())
                .size(pagination.getSize())
                .totalElements(pagination.getTotalElements())
                .totalPages(pagination.getTotalPages())
                .build();
    }

    private static final Set<String> INTERACTION_ACTIONS = Set.of(
            "REACTION_ADDED", "COMMENT_ADDED", "POST_SHARED", "POST_CREATED", "FRIEND_REQUEST_SENT"
    );

    @Override
    @Transactional(readOnly = true)
    public List<ActivityLogItemResponse> getRecentInteractionLogs(
            LocalDateTime from,
            LocalDateTime to,
            String actionType,
            int limit
    ) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        Pageable pageable = PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<UserActivityLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            if (actionType != null && !actionType.isBlank()) {
                predicates.add(cb.equal(root.get("actionType"), actionType));
            } else {
                predicates.add(root.get("actionType").in(INTERACTION_ACTIONS));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<UserActivityLog> page = repository.findAll(spec, pageable);
        Map<UUID, User> usersById = loadUsers(page.getContent());
        return page.getContent().stream()
                .map(log -> toItem(log, usersById))
                .toList();
    }



    private ActivityLogItemResponse toItem(UserActivityLog log, Map<UUID, User> usersById) {
        User user = log.getUserId() != null ? usersById.get(log.getUserId()) : null;

        LocalDateTime t = log.getCreatedAt();
        long loginBurst = log.getUserId() != null
                ? repository.countLoginBurst(log.getUserId(), t.minusMinutes(10), t) : 0;
        long failedBurst = log.getUserId() != null
                ? repository.countFailedLoginBurst(log.getUserId(), t.minusMinutes(15), t) : 0;
        boolean newIp = log.getUserId() != null && log.getIpAddress() != null
                && !repository.existsPriorIpForUser(log.getUserId(), log.getIpAddress(), t);

        ActivityLogMapper.AbnormalResult abnormal = ActivityLogMapper.detectAbnormal(
                log, loginBurst, failedBurst, newIp);

        return ActivityLogItemResponse.builder()
                .id(log.getId())
                .userId(log.getUserId())
                .username(log.getUsername())
                .fullName(user != null ? user.getFullName() : null)
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .actionType(log.getActionType())
                .actionLabel(ActivityLogMapper.resolveActionLabel(log))
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .status(ActivityLogMapper.resolveStatus(log))
                .severity(ActivityLogMapper.resolveSeverity(log))
                .description(resolveDescription(log, usersById))
                .ipAddress(log.getIpAddress())
                .userAgent(log.getUserAgent())
                .deviceType(log.getDeviceType())
                .browser(log.getBrowser())
                .os(log.getOs())
                .location(log.getLocation())
                .metadata(log.getMetadata())
                .createdAt(log.getCreatedAt())
                .abnormal(abnormal.abnormal())
                .abnormalReason(abnormal.reason())
                .build();
    }

    private Map<UUID, User> loadUsers(List<UserActivityLog> logs) {
        // Gom cả chủ thể (userId) lẫn đối tượng của hành động kết bạn (targetUserId/requesterId
        // trong metadata) để phân giải tên trong một truy vấn, tránh N+1.
        Set<UUID> ids = new HashSet<>();
        for (UserActivityLog log : logs) {
            if (log.getUserId() != null) {
                ids.add(log.getUserId());
            }
            UUID friendTargetId = extractFriendTargetId(log);
            if (friendTargetId != null) {
                ids.add(friendTargetId);
            }
        }
        if (ids.isEmpty()) return Map.of();
        Map<UUID, User> map = new HashMap<>();
        userRepository.findAllById(ids).forEach(u -> map.put(u.getId(), u));
        return map;
    }

    /**
     * Description hiển thị. Với hành động kết bạn, bổ sung "đến/từ &lt;tên đối tượng&gt;" để admin
     * thấy rõ ai gửi lời mời/chấp nhận với ai; các loại khác giữ nguyên mô tả mặc định.
     */
    private String resolveDescription(UserActivityLog log, Map<UUID, User> usersById) {
        String base = ActivityLogMapper.resolveDescription(log);
        UUID friendTargetId = extractFriendTargetId(log);
        if (friendTargetId == null) {
            return base;
        }
        String targetName = displayName(usersById.get(friendTargetId));
        if (targetName == null) {
            return base;
        }
        return "FRIEND_ACCEPTED".equals(log.getActionType())
                ? "Chấp nhận lời mời kết bạn từ " + targetName
                : "Gửi lời mời kết bạn đến " + targetName;
    }

    private static String displayName(User user) {
        if (user == null) {
            return null;
        }
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        return user.getUsername();
    }

    /** Id của "người còn lại" trong hành động kết bạn (targetUserId khi gửi, requesterId khi chấp nhận), hoặc null. */
    private static UUID extractFriendTargetId(UserActivityLog log) {
        String type = log.getActionType();
        if (!"FRIEND_REQUEST_SENT".equals(type) && !"FRIEND_ACCEPTED".equals(type)) {
            return null;
        }
        String meta = log.getMetadata();
        if (meta == null || meta.isBlank() || !meta.trim().startsWith("{")) {
            return null;
        }
        try {
            JsonNode node = OBJECT_MAPPER.readTree(meta);
            String field = "FRIEND_ACCEPTED".equals(type) ? "requesterId" : "targetUserId";
            String raw = node.path(field).asText(null);
            return (raw == null || raw.isBlank()) ? null : UUID.fromString(raw);
        } catch (Exception e) {
            return null;
        }
    }

    private ActivityLogSummaryResponse buildSummary(LocalDateTime from, LocalDateTime to) {
        LocalDateTime safeFrom = from != null ? from : LocalDateTime.now().minusDays(30);
        LocalDateTime safeTo = to != null ? to : LocalDateTime.now();

        long total = repository.countByCreatedAtBetween(safeFrom, safeTo);
        long failedLogin = repository.countFailedLoginsBetween(safeFrom, safeTo);
        long blockedMsg = repository.countBlockedMessagesBetween(safeFrom, safeTo);

        String topUsername = null;
        long topCount = 0;
        List<Object[]> topRow = repository.findTopActiveUserBetween(safeFrom, safeTo);
        if (!topRow.isEmpty() && topRow.get(0)[0] != null) {
            topUsername = topRow.get(0)[0].toString();
            topCount = ((Number) topRow.get(0)[1]).longValue();
        }

        String topFullName = null;
        if (topUsername != null) {
            topFullName = userRepository.findByUsername(topUsername)
                    .map(User::getFullName)
                    .orElse(null);
        }

        long suspicious = failedLogin + blockedMsg; // quick aggregate; refined per-item on list

        return ActivityLogSummaryResponse.builder()
                .totalLogs(total)
                .failedLoginCount(failedLogin)
                .blockedMessageCount(blockedMsg)
                .suspiciousActivityCount(suspicious)
                .topActiveUser(topUsername)
                .topActiveUserFullName(topFullName)
                .topActiveUserLogCount(topCount)
                .build();
    }

    private Specification<UserActivityLog> buildSpec(
            UUID userId,
            String username,
            String actionType,
            String status,
            String severity,
            LocalDateTime from,
            LocalDateTime to
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (userId != null) {
                predicates.add(cb.equal(root.get("userId"), userId));
            }
            if (username != null && !username.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("username")),
                        "%" + username.trim().toLowerCase() + "%"
                ));
            }
            if (actionType != null && !actionType.isBlank()) {
                predicates.add(cb.equal(root.get("actionType"), actionType));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (severity != null && !severity.isBlank()) {
                predicates.add(cb.equal(root.get("severity"), severity));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }


}
