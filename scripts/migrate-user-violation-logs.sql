-- Offense log for post/comment violations (chat keeps its own chat_moderation_logs).
-- Shared DB; only the Admin backend reads/writes this table.
CREATE TABLE IF NOT EXISTS public.user_violation_logs (
    id             UUID PRIMARY KEY,
    user_id        UUID        NOT NULL,
    source         VARCHAR(20) NOT NULL,
    ref_id         UUID,
    violation_type VARCHAR(50) NOT NULL,
    severity       VARCHAR(20) NOT NULL,
    created_at     TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_violation_logs_user_id ON public.user_violation_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_user_violation_logs_ref ON public.user_violation_logs (source, ref_id);
