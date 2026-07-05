-- Remove the auto-confirm hook so Supabase respects the email confirmation setting.
-- Users must now click the confirmation link sent to their email before signing in.
drop trigger if exists auto_confirm_user_trigger on auth.users;
drop function if exists public.auto_confirm_user();
