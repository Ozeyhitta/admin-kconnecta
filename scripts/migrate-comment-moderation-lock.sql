-- Chống hai admin duyệt cùng một comment PENDING.
-- Chạy trên DB shared (public.post_comments) trước khi deploy Admin backend.

ALTER TABLE public.post_comments
    ADD COLUMN IF NOT EXISTS moderation_locked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS moderation_locked_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_post_comments_moderation_lock
    ON public.post_comments (moderation_locked_by)
    WHERE moderation_locked_by IS NOT NULL;
