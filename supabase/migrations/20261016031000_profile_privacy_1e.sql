-- 1e: private profile fields (PromptPay ID, Stripe account, strikes, payout info) are no
-- longer readable by every visitor. Public pages read the safe column set below; users read
-- their own full row through get_my_profile(); admins list users through admin_list_users().
-- Apply only after the client that uses explicit column lists is deployed.

REVOKE SELECT ON public.profiles FROM anon, authenticated;
-- is_admin / is_banned stay readable because RLS policies on other tables evaluate them.
GRANT SELECT (id, display_name, location, avatar_url, rating, sales_count,
              created_at, updated_at, is_admin, is_banned, has_promptpay)
  ON public.profiles TO anon, authenticated;
