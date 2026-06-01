-- Extend user_activity_logs for rich admin activity analytics
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS action_label VARCHAR(100);
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS target_type VARCHAR(50);
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS status VARCHAR(20);
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS severity VARCHAR(20);
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS device_type VARCHAR(30);
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS browser VARCHAR(50);
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS os VARCHAR(50);
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS location VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_ual_status ON public.user_activity_logs(status);
CREATE INDEX IF NOT EXISTS idx_ual_severity ON public.user_activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_ual_ip ON public.user_activity_logs(ip_address);
