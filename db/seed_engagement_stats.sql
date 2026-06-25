-- ============================================================================
-- SEED dữ liệu tương tác cho trang "Thống kê tương tác" (Admin)
-- ----------------------------------------------------------------------------
-- Mục tiêu : đủ MAU/DAU + lượt tương tác trong ~60 ngày để dashboard hiển thị
--            hợp lý (MAU >= 20 -> thoát "chế độ dữ liệu thấp").
-- Phạm vi  : CHỈ ghi vào bảng public.user_activity_logs. Không đụng bảng users,
--            auth, hay bất kỳ bảng nào khác. user_id là cột UUID KHÔNG có FK,
--            và mọi thống kê (DAU/MAU, tương tác, top user) đọc thẳng từ bảng
--            này nên không cần user thật.
-- An toàn  : mọi dòng seed đều có ip_address = 'SEED-DATA'.
--            => HOÀN TÁC bất cứ lúc nào bằng đúng 1 lệnh:
--               DELETE FROM public.user_activity_logs WHERE ip_address = 'SEED-DATA';
-- Cách chạy:
--   psql "postgresql://<user>:<pass>@<host>:5432/<db>?sslmode=require" -f db/seed_engagement_stats.sql
--   (hoặc mở DBeaver/pgAdmin, dán toàn bộ file rồi Execute as script)
-- Chạy lại nhiều lần đều an toàn: script tự xoá seed cũ trước khi tạo mới.
-- ============================================================================

BEGIN;

-- Idempotent: dọn seed cũ (nếu có) để không nhân đôi khi chạy lại.
DELETE FROM public.user_activity_logs WHERE ip_address = 'SEED-DATA';

-- 40 user ảo (chỉ tồn tại trong activity log).
CREATE TEMP TABLE _seed_users (username text, full_name text) ON COMMIT DROP;
INSERT INTO _seed_users (username, full_name) VALUES
  ('minhanh',    'Nguyễn Minh Anh'),
  ('quanghuy',   'Trần Quang Huy'),
  ('thuylinh',   'Lê Thùy Linh'),
  ('ducmanh',    'Phạm Đức Mạnh'),
  ('ngocha',     'Vũ Ngọc Hà'),
  ('tuananh',    'Đỗ Tuấn Anh'),
  ('phuongthao', 'Bùi Phương Thảo'),
  ('giabao',     'Hoàng Gia Bảo'),
  ('khanhvy',    'Đặng Khánh Vy'),
  ('hoangnam',   'Ngô Hoàng Nam'),
  ('myduyen',    'Dương Mỹ Duyên'),
  ('vanlong',    'Lý Văn Long'),
  ('thanhtam',   'Cao Thanh Tâm'),
  ('hieutran',   'Trần Trung Hiếu'),
  ('lanphuong',  'Nguyễn Lan Phương'),
  ('baochau',    'Phan Bảo Châu'),
  ('dinhkhoa',   'Võ Đình Khoa'),
  ('yennhi',     'Đoàn Yến Nhi'),
  ('quocdat',    'Trịnh Quốc Đạt'),
  ('thuhuong',   'Mai Thu Hương'),
  ('viethoang',  'Lê Việt Hoàng'),
  ('kimngan',    'Nguyễn Kim Ngân'),
  ('trongphuc',  'Hồ Trọng Phúc'),
  ('haiyen',     'Phạm Hải Yến'),
  ('anhtu',      'Đặng Anh Tú'),
  ('phamhung',   'Phạm Mạnh Hùng'),
  ('lethanh',    'Lê Công Thành'),
  ('trannga',    'Trần Thúy Nga'),
  ('vominh',     'Võ Quang Minh'),
  ('dangloan',   'Đặng Thị Loan'),
  ('buihai',     'Bùi Tiến Hải'),
  ('nguyenvy',   'Nguyễn Tường Vy'),
  ('phankien',   'Phan Trung Kiên'),
  ('hovantai',   'Hồ Văn Tài'),
  ('dokhanhlinh','Đỗ Khánh Linh'),
  ('luuduc',     'Lưu Minh Đức'),
  ('caoson',     'Cao Hồng Sơn'),
  ('maihoa',     'Mai Thanh Hoa'),
  ('trinhdat',   'Trịnh Tiến Đạt'),
  ('vuthao',     'Vũ Phương Thảo');

-- Cặp (user, ngày) hoạt động trong 60 ngày gần nhất.
-- QUAN TRỌNG: dùng HASH xác định theo (user, ngày) thay cho random(), vì random()
-- trong WHERE bị Postgres cache 1 lần cho cả query -> mỗi ngày hoá "tất cả active"
-- hoặc "không ai" (biểu đồ răng cưa 0↔40, DAU/MAU ~90%). hashtext biến thiên thật
-- theo từng dòng. Xác suất active ~24% -> ~29% (tăng nhẹ + cuối tuần nhỉnh hơn).
-- Với 40 user: DAU/ngày ~11 (mượt), DAU/MAU ~25-28% ("Tốt" thực tế), xu hướng "Ổn định".
-- Bonus: hoàn toàn xác định -> chạy lại cho kết quả y hệt (tái lập được).
CREATE TEMP TABLE _seed_active ON COMMIT DROP AS
SELECT
  su.username,
  md5('seed-user-' || su.username)::uuid AS uid,
  g::date                                AS day
FROM _seed_users su
CROSS JOIN generate_series(CURRENT_DATE - 59, CURRENT_DATE, interval '1 day') AS g
WHERE (hashtext(su.username || '#' || g::date::text) & 2147483647)::numeric / 2147483647.0
      < 0.24
        + 0.05 * ((g::date - (CURRENT_DATE - 59))::numeric / 59.0)        -- tăng nhẹ theo thời gian
        + CASE WHEN EXTRACT(DOW FROM g) IN (0, 6) THEN 0.03 ELSE 0 END;   -- cuối tuần nhỉnh hơn

-- ---- 1) Sự kiện ĐĂNG NHẬP (góp vào DAU/MAU) ----
INSERT INTO public.user_activity_logs
  (id, user_id, username, action_type, action_label, status, severity, ip_address, created_at)
SELECT
  md5(a.username || a.day::text || 'L')::uuid,
  a.uid, a.username, 'LOGIN', 'Đăng nhập',
  'SUCCESS', 'INFO', 'SEED-DATA',
  a.day + interval '1 second'
        * (25200 + (hashtext(a.username || 'L' || a.day::text) & 2147483647) % 50400)  -- 07:00–21:00
FROM _seed_active a;

-- ---- 2) Sự kiện TƯƠNG TÁC (2..8 / user / ngày active) ----
-- Phân bố: Bình luận 38% · Cảm xúc 26% · Bài đăng 20% · Chia sẻ 10% · Kết bạn 6%
INSERT INTO public.user_activity_logs
  (id, user_id, username, action_type, action_label, target_type, target_id,
   status, severity, ip_address, created_at)
SELECT
  md5(a.username || a.day::text || s.n::text || 'I')::uuid,
  a.uid, a.username,
  CASE WHEN s.pick < 0.38 THEN 'COMMENT_ADDED'
       WHEN s.pick < 0.64 THEN 'REACTION_ADDED'
       WHEN s.pick < 0.84 THEN 'POST_CREATED'
       WHEN s.pick < 0.94 THEN 'POST_SHARED'
       ELSE                    'FRIEND_REQUEST_SENT' END,
  CASE WHEN s.pick < 0.38 THEN 'Bình luận bài viết'
       WHEN s.pick < 0.64 THEN 'Thả cảm xúc'
       WHEN s.pick < 0.84 THEN 'Đăng bài viết'
       WHEN s.pick < 0.94 THEN 'Chia sẻ bài viết'
       ELSE                    'Gửi lời mời kết bạn' END,
  CASE WHEN s.pick < 0.38 THEN 'COMMENT'
       WHEN s.pick < 0.94 THEN 'POST'
       ELSE                    'USER' END,
  md5(a.username || a.day::text || s.n::text || 'T')::uuid,
  'SUCCESS', 'INFO', 'SEED-DATA',
  a.day + interval '1 second'
        * (25200 + (hashtext(a.username || 'I' || a.day::text || s.n::text) & 2147483647) % 54000)  -- 07:00–22:00
FROM _seed_active a
CROSS JOIN LATERAL (
  SELECT
    gs AS n,
    (hashtext(a.username || '#' || a.day::text || '#' || gs::text) & 2147483647)::numeric / 2147483647.0 AS pick
  FROM generate_series(1, 2 + ((hashtext(a.username || '@' || a.day::text) & 2147483647) % 7)) AS gs
) s;

-- ---- Kiểm tra nhanh kết quả seed (in ra khi chạy) ----
SELECT 'MAU 30 ngày (seed)'      AS metric, count(DISTINCT user_id)::text AS value
  FROM public.user_activity_logs
  WHERE ip_address = 'SEED-DATA' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT 'Tổng dòng seed',          count(*)::text
  FROM public.user_activity_logs WHERE ip_address = 'SEED-DATA'
UNION ALL
SELECT 'Tương tác 30 ngày (seed)', count(*)::text
  FROM public.user_activity_logs
  WHERE ip_address = 'SEED-DATA'
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND action_type IN ('REACTION_ADDED','COMMENT_ADDED','POST_SHARED','POST_CREATED','FRIEND_REQUEST_SENT');

COMMIT;

-- ============================================================================
-- HOÀN TÁC (chạy riêng khi muốn xoá toàn bộ dữ liệu seed):
--   DELETE FROM public.user_activity_logs WHERE ip_address = 'SEED-DATA';
-- ============================================================================
