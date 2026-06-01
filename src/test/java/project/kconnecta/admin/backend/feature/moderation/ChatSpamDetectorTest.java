package project.kconnecta.admin.backend.feature.moderation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import project.kconnecta.admin.backend.common.enums.AlertType;
import project.kconnecta.admin.backend.feature.moderation.dto.ViolationResult;
import project.kconnecta.admin.backend.feature.moderation.service.ChatSpamDetector;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ChatSpamDetectorTest {

    private ChatSpamDetector detector;
    private UUID userId;

    @BeforeEach
    void setUp() {
        detector = new ChatSpamDetector();
        userId = UUID.randomUUID();
    }

    // --- Rate limit tests ---

    @Test
    void rateLimitViolation_when21MessagesInLast60Seconds() {
        LocalDateTime now = LocalDateTime.now();
        List<ChatSpamDetector.MessageData> messages = new ArrayList<>();
        for (int i = 0; i < 21; i++) {
            messages.add(new ChatSpamDetector.MessageData(
                    UUID.randomUUID(),
                    userId,
                    "message " + i,
                    now.minusSeconds(i)   // all within last 60s
            ));
        }

        List<ViolationResult> violations = detector.detect(userId, messages);

        assertTrue(violations.stream().anyMatch(v -> v.getAlertType() == AlertType.RATE_LIMIT),
                "Expected RATE_LIMIT violation for 21 messages in 60s");
    }

    @Test
    void noRateLimitViolation_when20MessagesInLast60Seconds() {
        LocalDateTime now = LocalDateTime.now();
        List<ChatSpamDetector.MessageData> messages = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            messages.add(new ChatSpamDetector.MessageData(
                    UUID.randomUUID(),
                    userId,
                    "message " + i,
                    now.minusSeconds(i)
            ));
        }

        List<ViolationResult> violations = detector.detect(userId, messages);

        assertFalse(violations.stream().anyMatch(v -> v.getAlertType() == AlertType.RATE_LIMIT),
                "Expected no RATE_LIMIT violation for exactly 20 messages in 60s");
    }

    // --- Duplicate message tests ---

    @Test
    void duplicateViolation_when3SameMessagesInLast120Seconds() {
        LocalDateTime now = LocalDateTime.now();
        String sameContent = "hello world";
        List<ChatSpamDetector.MessageData> messages = List.of(
                new ChatSpamDetector.MessageData(UUID.randomUUID(), userId, sameContent, now.minusSeconds(10)),
                new ChatSpamDetector.MessageData(UUID.randomUUID(), userId, sameContent, now.minusSeconds(30)),
                new ChatSpamDetector.MessageData(UUID.randomUUID(), userId, sameContent, now.minusSeconds(50))
        );

        List<ViolationResult> violations = detector.detect(userId, messages);

        assertTrue(violations.stream().anyMatch(v -> v.getAlertType() == AlertType.DUPLICATE_MESSAGE),
                "Expected DUPLICATE_MESSAGE violation for 3 identical messages in 120s");
    }

    @Test
    void noDuplicateViolation_when2SameMessagesInLast120Seconds() {
        LocalDateTime now = LocalDateTime.now();
        String sameContent = "hello world";
        List<ChatSpamDetector.MessageData> messages = List.of(
                new ChatSpamDetector.MessageData(UUID.randomUUID(), userId, sameContent, now.minusSeconds(10)),
                new ChatSpamDetector.MessageData(UUID.randomUUID(), userId, sameContent, now.minusSeconds(30))
        );

        List<ViolationResult> violations = detector.detect(userId, messages);

        assertFalse(violations.stream().anyMatch(v -> v.getAlertType() == AlertType.DUPLICATE_MESSAGE),
                "Expected no DUPLICATE_MESSAGE violation for only 2 identical messages");
    }

    // --- Malicious link tests ---

    @Test
    void maliciousLinkViolation_whenMessageContainsSuspiciousLink() {
        LocalDateTime now = LocalDateTime.now();
        List<ChatSpamDetector.MessageData> messages = List.of(
                new ChatSpamDetector.MessageData(
                        UUID.randomUUID(),
                        userId,
                        "Check this out http://example.xyz/promo",
                        now.minusSeconds(5)
                )
        );

        List<ViolationResult> violations = detector.detect(userId, messages);

        assertTrue(violations.stream().anyMatch(v -> v.getAlertType() == AlertType.MALICIOUS_LINK),
                "Expected MALICIOUS_LINK violation for .xyz domain link");
    }

    @Test
    void maliciousLinkViolation_whenMessageContainsBitlyLink() {
        LocalDateTime now = LocalDateTime.now();
        List<ChatSpamDetector.MessageData> messages = List.of(
                new ChatSpamDetector.MessageData(
                        UUID.randomUUID(),
                        userId,
                        "Visit https://bit.ly/abc123",
                        now.minusSeconds(5)
                )
        );

        List<ViolationResult> violations = detector.detect(userId, messages);

        assertTrue(violations.stream().anyMatch(v -> v.getAlertType() == AlertType.MALICIOUS_LINK),
                "Expected MALICIOUS_LINK violation for bit.ly link");
    }

    // --- Blocked keyword tests ---

    @Test
    void blockedKeywordViolation_whenMessageContainsFreeMoneyKeyword() {
        LocalDateTime now = LocalDateTime.now();
        List<ChatSpamDetector.MessageData> messages = List.of(
                new ChatSpamDetector.MessageData(
                        UUID.randomUUID(),
                        userId,
                        "You can get free money if you sign up!",
                        now.minusSeconds(5)
                )
        );

        List<ViolationResult> violations = detector.detect(userId, messages);

        assertTrue(violations.stream().anyMatch(v -> v.getAlertType() == AlertType.BLOCKED_KEYWORD),
                "Expected BLOCKED_KEYWORD violation for 'free money'");
    }

    @Test
    void blockedKeywordViolation_whenMessageContainsClickHereKeyword() {
        LocalDateTime now = LocalDateTime.now();
        List<ChatSpamDetector.MessageData> messages = List.of(
                new ChatSpamDetector.MessageData(
                        UUID.randomUUID(),
                        userId,
                        "click here to learn more",
                        now.minusSeconds(5)
                )
        );

        List<ViolationResult> violations = detector.detect(userId, messages);

        assertTrue(violations.stream().anyMatch(v -> v.getAlertType() == AlertType.BLOCKED_KEYWORD),
                "Expected BLOCKED_KEYWORD violation for 'click here'");
    }

    // --- Clean message test ---

    @Test
    void noViolations_whenMessageIsClean() {
        LocalDateTime now = LocalDateTime.now();
        List<ChatSpamDetector.MessageData> messages = List.of(
                new ChatSpamDetector.MessageData(UUID.randomUUID(), userId, "Hey, how are you?", now.minusSeconds(5)),
                new ChatSpamDetector.MessageData(UUID.randomUUID(), userId, "I'm doing well, thanks!", now.minusSeconds(3)),
                new ChatSpamDetector.MessageData(UUID.randomUUID(), userId, "Let's catch up soon.", now.minusSeconds(1))
        );

        List<ViolationResult> violations = detector.detect(userId, messages);

        assertTrue(violations.isEmpty(), "Expected no violations for clean messages");
    }

    // --- Dedup: same AlertType not returned twice ---

    @Test
    void noDuplicateAlertTypes_inSingleDetectionRun() {
        LocalDateTime now = LocalDateTime.now();
        // Two messages with blocked keywords — should only produce ONE BLOCKED_KEYWORD result
        List<ChatSpamDetector.MessageData> messages = List.of(
                new ChatSpamDetector.MessageData(UUID.randomUUID(), userId, "click here now", now.minusSeconds(5)),
                new ChatSpamDetector.MessageData(UUID.randomUUID(), userId, "dm me for free money", now.minusSeconds(3))
        );

        List<ViolationResult> violations = detector.detect(userId, messages);

        long blockedCount = violations.stream()
                .filter(v -> v.getAlertType() == AlertType.BLOCKED_KEYWORD)
                .count();
        assertEquals(1, blockedCount, "Expected at most one BLOCKED_KEYWORD violation per detection run");
    }
}
