package project.kconnecta.admin.backend.feature.moderation.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import project.kconnecta.admin.backend.common.enums.AlertSeverity;
import project.kconnecta.admin.backend.feature.moderation.dto.ViolationResult;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
public class ModerationScannerJob {

    private final NamedParameterJdbcTemplate jdbc;
    private final ChatSpamDetector chatSpamDetector;
    private final ChatModerationLogService chatModerationLogService;
    private final AdminAlertService adminAlertService;
    private final ViolationPenaltyService violationPenaltyService;

    private volatile LocalDateTime lastScannedAt;

    public ModerationScannerJob(
            NamedParameterJdbcTemplate jdbc,
            ChatSpamDetector chatSpamDetector,
            ChatModerationLogService chatModerationLogService,
            AdminAlertService adminAlertService,
            ViolationPenaltyService violationPenaltyService
    ) {
        this.jdbc = jdbc;
        this.chatSpamDetector = chatSpamDetector;
        this.chatModerationLogService = chatModerationLogService;
        this.adminAlertService = adminAlertService;
        this.violationPenaltyService = violationPenaltyService;
        this.lastScannedAt = LocalDateTime.now().minusMinutes(3);
    }

    @Scheduled(fixedDelay = 60_000)
    public void scan() {
        LocalDateTime since = lastScannedAt;
        log.debug("Moderation scan starting, since={}", since);

        List<ChatSpamDetector.MessageData> allMessages = fetchMessages(since);

        Map<UUID, List<ChatSpamDetector.MessageData>> bySender = new LinkedHashMap<>();
        for (ChatSpamDetector.MessageData msg : allMessages) {
            bySender.computeIfAbsent(msg.senderId(), k -> new ArrayList<>()).add(msg);
        }

        for (Map.Entry<UUID, List<ChatSpamDetector.MessageData>> entry : bySender.entrySet()) {
            UUID userId = entry.getKey();
            List<ChatSpamDetector.MessageData> msgs = entry.getValue();

            // A permanent ban is terminal. Do not keep logging the user's remaining
            // queued messages and repeatedly update the lock reason/offense count.
            if (violationPenaltyService.isPermanentlyBlocked(userId)) {
                continue;
            }

            List<ViolationResult> violations = chatSpamDetector.detect(userId, msgs);
            List<ViolationResult> newViolations = new ArrayList<>();

            for (ViolationResult violation : violations) {
                try {
                    if (chatModerationLogService.logIfNew(violation)) {
                        newViolations.add(violation);
                    }
                } catch (Exception e) {
                    log.warn("Failed to log violation for user {}: {}", userId, e.getMessage());
                }

                AlertSeverity sev = violation.getSeverity();
                if (sev == AlertSeverity.MEDIUM || sev == AlertSeverity.HIGH || sev == AlertSeverity.CRITICAL) {
                    try {
                        adminAlertService.createIfNotExists(violation);
                    } catch (Exception e) {
                        log.warn("Failed to create alert for user {}: {}", userId, e.getMessage());
                    }
                }
            }

            if (!newViolations.isEmpty()) {
                try {
                    violationPenaltyService.applyForNewViolations(userId, newViolations);
                } catch (Exception e) {
                    log.warn("Failed to apply violation policy for user {}: {}", userId, e.getMessage());
                }
            }
        }

        lastScannedAt = LocalDateTime.now();
        log.debug("Moderation scan complete, processed {} senders", bySender.size());
    }

    private List<ChatSpamDetector.MessageData> fetchMessages(LocalDateTime since) {
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("since", since);
        return jdbc.query(
                "SELECT id, sender_id, content, created_at FROM chat_messages " +
                        "WHERE created_at > :since AND deleted = false " +
                        "ORDER BY sender_id, created_at",
                params,
                (rs, rowNum) -> new ChatSpamDetector.MessageData(
                        rs.getObject("id", UUID.class),
                        rs.getObject("sender_id", UUID.class),
                        rs.getString("content"),
                        rs.getObject("created_at", LocalDateTime.class)
                )
        );
    }
}
