package project.kconnecta.admin.backend.feature.moderation.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.admin.backend.common.enums.AccountStatus;
import project.kconnecta.admin.backend.common.enums.AlertSeverity;
import project.kconnecta.admin.backend.common.enums.AlertType;
import project.kconnecta.admin.backend.entity.User;
import project.kconnecta.admin.backend.feature.moderation.dto.ViolationResult;
import project.kconnecta.admin.backend.feature.moderation.repository.ChatModerationLogRepository;
import project.kconnecta.admin.backend.feature.notification.service.NotificationAdminService;
import project.kconnecta.admin.backend.feature.policy.service.PolicyAdminService;
import project.kconnecta.admin.backend.feature.user.repository.AccountRepository;
import project.kconnecta.admin.backend.feature.user.repository.UserRepository;
import tools.jackson.databind.JsonNode;

import java.util.Comparator;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ViolationPenaltyService {

    private static final List<PenaltyStep> DEFAULT_STEPS = List.of(
            new PenaltyStep(1, "warning", 0),
            new PenaltyStep(2, "lock_temp", 3),
            new PenaltyStep(3, "ban_permanent", 0)
    );

    private final PolicyAdminService policyAdminService;
    private final ChatModerationLogRepository moderationLogRepository;
    private final ChatRestrictionService chatRestrictionService;
    private final NotificationAdminService notificationAdminService;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;

    @Transactional
    public void applyForNewViolations(UUID userId, List<ViolationResult> violations) {
        if (userId == null || violations == null || violations.isEmpty()) {
            return;
        }

        ViolationResult primaryViolation = violations.stream()
                .max(Comparator.comparingInt(v -> severityRank(v.getSeverity())))
                .orElse(violations.get(0));

        String policyId = resolvePolicyId(primaryViolation.getAlertType());
        long offenseCount = countOffenses(userId, policyId);
        PenaltyStep step = resolvePenaltyStep(policyId, offenseCount);

        if (step == null) {
            log.debug("No penalty step configured for user={}, policy={}, offense={}", userId, policyId, offenseCount);
            return;
        }

        String violationLabel = violationLabel(policyId, primaryViolation);
        switch (step.action()) {
            case "warning" -> notifyUser(userId, buildWarningMessage(violationLabel, offenseCount));
            case "lock_temp" -> applyTemporaryLock(userId, step.lockDays(), violationLabel, offenseCount);
            case "ban_permanent" -> applyPermanentBan(userId, violationLabel, offenseCount);
            default -> log.warn("Unknown violation penalty action '{}' for policy {}", step.action(), policyId);
        }
    }

    private long countOffenses(UUID userId, String policyId) {
        Set<AlertType> alertTypes = alertTypesForPolicy(policyId);
        if (alertTypes.isEmpty()) {
            return moderationLogRepository.countByUserId(userId);
        }
        return moderationLogRepository.countByUserIdAndViolationTypeIn(userId, alertTypes);
    }

    private PenaltyStep resolvePenaltyStep(String policyId, long offenseCount) {
        List<PenaltyStep> steps = readPolicySteps(policyId);
        int offense = (int) Math.min(Math.max(offenseCount, 1), 3);
        return steps.stream()
                .filter(step -> step.offense() == offense)
                .findFirst()
                .orElseGet(() -> steps.stream()
                        .max(Comparator.comparingInt(PenaltyStep::offense))
                        .orElse(null));
    }

    private List<PenaltyStep> readPolicySteps(String policyId) {
        try {
            JsonNode policies = policyAdminService.getConfig().path("violationPolicies");
            if (policies.isArray()) {
                List<PenaltyStep> exact = stepsForPolicy(policies, policyId);
                if (!exact.isEmpty()) {
                    return exact;
                }
                List<PenaltyStep> fallback = stepsForPolicy(policies, "default");
                if (!fallback.isEmpty()) {
                    return fallback;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to load violation policy, using defaults: {}", e.getMessage());
        }
        return DEFAULT_STEPS;
    }

    private List<PenaltyStep> stepsForPolicy(JsonNode policies, String policyId) {
        for (JsonNode policy : policies) {
            if (!policyId.equals(policy.path("id").asText(""))) {
                continue;
            }
            JsonNode steps = policy.path("steps");
            if (!steps.isArray()) {
                return List.of();
            }
            List<PenaltyStep> resolved = new ArrayList<>();
            for (JsonNode step : steps) {
                resolved.add(new PenaltyStep(
                        step.path("offense").asInt(1),
                        step.path("action").asText("warning"),
                        step.path("lockDays").asInt(3)
                ));
            }
            return resolved;
        }
        return List.of();
    }

    private void applyTemporaryLock(UUID userId, int lockDays, String violationLabel, long offenseCount) {
        int safeDays = Math.max(lockDays, 1);
        chatRestrictionService.restrict(
                userId,
                safeDays * 24,
                "Vi phạm chính sách: " + violationLabel,
                "SYSTEM_POLICY"
        );
        notifyUser(userId, "Tài khoản của bạn đã vi phạm chính sách " + violationLabel
                + " lần " + offenseCount + ". Tính năng chat bị khóa tạm " + safeDays + " ngày.");
    }

    private void applyPermanentBan(UUID userId, String violationLabel, long offenseCount) {
        userRepository.findById(userId)
                .map(User::getAccount)
                .ifPresent(account -> {
                    account.setStatus(AccountStatus.BLOCKED);
                    accountRepository.save(account);
                });
        notifyUser(userId, "Tài khoản của bạn đã bị khóa do vi phạm chính sách "
                + violationLabel + " lần " + offenseCount + ".");
    }

    private void notifyUser(UUID userId, String message) {
        try {
            notificationAdminService.send(userId, message);
        } catch (Exception e) {
            log.warn("Failed to send violation notification to user {}: {}", userId, e.getMessage());
        }
    }

    private String buildWarningMessage(String violationLabel, long offenseCount) {
        return "Cảnh cáo: bạn đã vi phạm chính sách " + violationLabel
                + " lần " + offenseCount + ". Vui lòng điều chỉnh nội dung để tránh bị khóa tính năng.";
    }

    private String resolvePolicyId(AlertType alertType) {
        if (alertType == null) {
            return "default";
        }
        return switch (alertType) {
            case RATE_LIMIT, DUPLICATE_MESSAGE, CHAT_SPAM -> "spam";
            case BLOCKED_KEYWORD, PROFANITY -> "toxic";
            default -> "default";
        };
    }

    private Set<AlertType> alertTypesForPolicy(String policyId) {
        return switch (policyId) {
            case "spam" -> Set.of(AlertType.RATE_LIMIT, AlertType.DUPLICATE_MESSAGE, AlertType.CHAT_SPAM);
            case "toxic" -> Set.of(AlertType.BLOCKED_KEYWORD, AlertType.PROFANITY);
            default -> Set.of();
        };
    }

    private String violationLabel(String policyId, ViolationResult violation) {
        return switch (policyId.toLowerCase(Locale.ROOT)) {
            case "spam" -> "Spam / quảng cáo";
            case "toxic" -> "Toxic / hate speech";
            default -> violation.getAlertTitle() != null && !violation.getAlertTitle().isBlank()
                    ? violation.getAlertTitle()
                    : "tiêu chuẩn cộng đồng";
        };
    }

    private int severityRank(AlertSeverity severity) {
        if (severity == null) {
            return 0;
        }
        return switch (severity) {
            case LOW -> 1;
            case MEDIUM -> 2;
            case HIGH -> 3;
            case CRITICAL -> 4;
        };
    }

    private record PenaltyStep(int offense, String action, int lockDays) {
    }
}
