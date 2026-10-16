/** Columns of `profiles` that anyone may read. Sensitive fields (promptpay_id, stripe_*, strike_count,
 *  payout_*) are only available to their owner through the `get_my_profile` RPC. */
export const PUBLIC_PROFILE_COLUMNS =
  'id, display_name, location, avatar_url, rating, sales_count, created_at, updated_at, is_admin, is_banned, has_promptpay';
