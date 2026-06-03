-- Seed default moderation config values (run once after deploy)
INSERT INTO moderation_config (key, value, updated_at) VALUES
  ('rate_limit_max_messages',  '10',  NOW()),
  ('rate_limit_window_seconds','60',  NOW()),
  ('duplicate_window_seconds', '120', NOW()),
  ('duplicate_threshold',      '3',   NOW())
ON CONFLICT (key) DO NOTHING;
