-- Regression checks for 20261016000000_security_lockdown_1a.sql.
-- Run with: supabase db query --linked -f supabase/tests/rls/security_1a.sql
-- Each block raises on failure; success = no error.
begin;
do $$
begin
  if has_column_privilege('authenticated', 'public.profiles', 'is_admin', 'UPDATE') then
    raise exception 'FAIL: authenticated can update profiles.is_admin';
  end if;
  if has_column_privilege('authenticated', 'public.profiles', 'is_banned', 'UPDATE') then
    raise exception 'FAIL: authenticated can update profiles.is_banned';
  end if;
  if not has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE') then
    raise exception 'FAIL: authenticated cannot update own display_name';
  end if;
  if has_function_privilege('anon', 'public.cleanup_seed_data()', 'execute') then
    raise exception 'FAIL: anon can execute cleanup_seed_data';
  end if;
  if exists (select 1 from pg_policy where polname in ('msg_insert_sender')) then
    raise exception 'FAIL: legacy messages insert policy still present';
  end if;
end $$;
rollback;
