package project.kconnecta.admin.backend.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.Map;

/** A single moderation/trend alert shown in the alert box. */
@Value
@Builder
public class TrendAlertResponse {
    /** Stable synthetic id (type + target), handy as a React key. */
    String id;
    /**
     * Machine code for the rule that fired:
     * REPORT_SPIKE | VIRAL_POST | TOPIC_SURGE | CONTROVERSIAL.
     */
    String type;
    /** HIGH | MEDIUM | INFO — drives the badge colour on the frontend. */
    String severity;
    /** "post" or "topic". */
    String scope;
    /** Post id (for scope=post) or topic name (for scope=topic). */
    String targetId;
    /** Human-friendly label for the target (content preview or #topic). */
    String targetLabel;
    /** Short Vietnamese headline. */
    String title;
    /** Detailed Vietnamese explanation including the numbers that triggered it. */
    String message;
    /** Raw metrics that triggered the rule (value, threshold, ...) for tooltips/debugging. */
    Map<String, Object> metrics;
}
