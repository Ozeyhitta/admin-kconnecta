-- Expand admin_alerts.type check constraint to match AlertType enum in Java.
-- Run once on Admin DB when POST_REPORTED / ACCOUNT_REVIEW_REQUESTED inserts fail with:
--   admin_alerts_type_check violation
--
-- AlertType values (project.kconnecta.admin.backend.common.enums.AlertType):
--   CHAT_SPAM, PROFANITY, MALICIOUS_LINK, RATE_LIMIT, DUPLICATE_MESSAGE,
--   BLOCKED_KEYWORD, ACCOUNT_REVIEW_REQUESTED, POST_REPORTED

ALTER TABLE admin_alerts DROP CONSTRAINT IF EXISTS admin_alerts_type_check;

ALTER TABLE admin_alerts ADD CONSTRAINT admin_alerts_type_check CHECK (
    type IN (
        'CHAT_SPAM',
        'PROFANITY',
        'MALICIOUS_LINK',
        'RATE_LIMIT',
        'DUPLICATE_MESSAGE',
        'BLOCKED_KEYWORD',
        'ACCOUNT_REVIEW_REQUESTED',
        'POST_REPORTED'
    )
);
