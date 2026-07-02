ALTER TABLE public.accounts ALTER COLUMN role TYPE VARCHAR(20);
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_role_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_role_check CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN'));
