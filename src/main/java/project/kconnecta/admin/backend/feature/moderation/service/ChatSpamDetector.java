package project.kconnecta.admin.backend.feature.moderation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import project.kconnecta.admin.backend.common.enums.AlertSeverity;
import project.kconnecta.admin.backend.common.enums.AlertType;
import project.kconnecta.admin.backend.feature.moderation.dto.ViolationResult;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ChatSpamDetector {

    // Default fallback values (used when DB has no row for a key)
    private static final int DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
    private static final int DEFAULT_RATE_LIMIT_MAX_MESSAGES   = 10;
    private static final int DEFAULT_DUPLICATE_WINDOW_SECONDS  = 120;
    private static final int DEFAULT_DUPLICATE_THRESHOLD       = 3;

    private static final Pattern MALICIOUS_LINK_PATTERN = Pattern.compile(
            "(https?://[^\\s]+(?:\\.xyz|\\.tk|\\.ml|\\.ga|bit\\.ly|tinyurl)[^\\s]*)",
            Pattern.CASE_INSENSITIVE
    );

    private static final List<String> BLOCKED_KEYWORDS = List.of(
            "dm me", "follow me", "click here", "free money", "win prize"
    );

    private final ModerationConfigService configService;

    public record MessageData(UUID id, UUID senderId, String content, LocalDateTime createdAt) {}

    public List<ViolationResult> detect(UUID userId, List<MessageData> recentMessages) {
        int rateLimitWindowSeconds = configService.getInt("rate_limit_window_seconds", DEFAULT_RATE_LIMIT_WINDOW_SECONDS);
        int rateLimitMaxMessages   = configService.getInt("rate_limit_max_messages",   DEFAULT_RATE_LIMIT_MAX_MESSAGES);
        int duplicateWindowSeconds = configService.getInt("duplicate_window_seconds",  DEFAULT_DUPLICATE_WINDOW_SECONDS);
        int duplicateThreshold     = configService.getInt("duplicate_threshold",       DEFAULT_DUPLICATE_THRESHOLD);

        List<ViolationResult> violations = new ArrayList<>();
        Set<AlertType> seenTypes = EnumSet.noneOf(AlertType.class);
        LocalDateTime now = LocalDateTime.now();

        // Rate limit check
        if (!seenTypes.contains(AlertType.RATE_LIMIT)) {
            LocalDateTime rateLimitWindow = now.minusSeconds(rateLimitWindowSeconds);
            long countInWindow = recentMessages.stream()
                    .filter(m -> m.createdAt().isAfter(rateLimitWindow))
                    .count();
            if (countInWindow > rateLimitMaxMessages) {
                violations.add(ViolationResult.builder()
                        .userId(userId)
                        .messageId(recentMessages.isEmpty() ? null : recentMessages.get(recentMessages.size() - 1).id())
                        .conversationId(null)
                        .alertType(AlertType.RATE_LIMIT)
                        .severity(AlertSeverity.MEDIUM)
                        .messagePreview(null)
                        .messageHash(null)
                        .actionTaken("rate_limited")
                        .retryAfterSeconds(rateLimitWindowSeconds)
                        .alertTitle("Rate Limit Exceeded")
                        .alertDescription("User sent " + countInWindow + " messages in the last " + rateLimitWindowSeconds + " seconds.")
                        .build());
                seenTypes.add(AlertType.RATE_LIMIT);
            }
        }

        // Duplicate message check
        if (!seenTypes.contains(AlertType.DUPLICATE_MESSAGE)) {
            LocalDateTime dupWindow = now.minusSeconds(duplicateWindowSeconds);
            Map<String, Long> hashCounts = recentMessages.stream()
                    .filter(m -> m.createdAt().isAfter(dupWindow))
                    .collect(Collectors.groupingBy(
                            m -> computeHash(m.content()),
                            Collectors.counting()
                    ));
            hashCounts.entrySet().stream()
                    .filter(e -> e.getValue() >= duplicateThreshold)
                    .findFirst()
                    .ifPresent(entry -> {
                        String dupHash = entry.getKey();
                        MessageData sample = recentMessages.stream()
                                .filter(m -> computeHash(m.content()).equals(dupHash))
                                .findFirst()
                                .orElse(null);
                        violations.add(ViolationResult.builder()
                                .userId(userId)
                                .messageId(sample != null ? sample.id() : null)
                                .conversationId(null)
                                .alertType(AlertType.DUPLICATE_MESSAGE)
                                .severity(AlertSeverity.MEDIUM)
                                .messagePreview(sample != null ? truncate(sample.content(), 200) : null)
                                .messageHash(dupHash)
                                .actionTaken("duplicate_suppressed")
                                .retryAfterSeconds(null)
                                .alertTitle("Duplicate Message Detected")
                                .alertDescription("User sent the same message " + entry.getValue() + " times in the last " + duplicateWindowSeconds + " seconds.")
                                .build());
                        seenTypes.add(AlertType.DUPLICATE_MESSAGE);
                    });
        }

        // Malicious link check
        if (!seenTypes.contains(AlertType.MALICIOUS_LINK)) {
            for (MessageData msg : recentMessages) {
                if (MALICIOUS_LINK_PATTERN.matcher(msg.content()).find()) {
                    violations.add(ViolationResult.builder()
                            .userId(userId)
                            .messageId(msg.id())
                            .conversationId(null)
                            .alertType(AlertType.MALICIOUS_LINK)
                            .severity(AlertSeverity.HIGH)
                            .messagePreview(truncate(msg.content(), 200))
                            .messageHash(computeHash(msg.content()))
                            .actionTaken("malicious_link_flagged")
                            .retryAfterSeconds(null)
                            .alertTitle("Malicious Link Detected")
                            .alertDescription("User sent a message containing a potentially malicious link.")
                            .build());
                    seenTypes.add(AlertType.MALICIOUS_LINK);
                    break;
                }
            }
        }

        // Blocked keyword check
        if (!seenTypes.contains(AlertType.BLOCKED_KEYWORD)) {
            for (MessageData msg : recentMessages) {
                String lower = msg.content().toLowerCase();
                boolean hasKeyword = BLOCKED_KEYWORDS.stream().anyMatch(lower::contains);
                if (hasKeyword) {
                    violations.add(ViolationResult.builder()
                            .userId(userId)
                            .messageId(msg.id())
                            .conversationId(null)
                            .alertType(AlertType.BLOCKED_KEYWORD)
                            .severity(AlertSeverity.MEDIUM)
                            .messagePreview(truncate(msg.content(), 200))
                            .messageHash(computeHash(msg.content()))
                            .actionTaken("keyword_blocked")
                            .retryAfterSeconds(null)
                            .alertTitle("Blocked Keyword Detected")
                            .alertDescription("User sent a message containing a blocked keyword.")
                            .build());
                    seenTypes.add(AlertType.BLOCKED_KEYWORD);
                    break;
                }
            }
        }

        return violations;
    }

    public static String computeHash(String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }
}
