# Security Hardening Notes

This document tracks the security hardening work applied to ROOTS and any remaining operational follow-ups.

## Completed

### Phase 1 — Critical exposures & backdoors
- Moved Upstash Redis REST token out of the browser bundle into a Supabase Edge Function (`rate-limit`).
- Added caller authorization to all Edge Functions via shared `CRON_SECRET` / `Authorization` checks.
- Secured `verify-slip` so only transaction buyer/seller can trigger SlipOK verification.
- Removed the `loginAsLocalAdmin` development bypass from the production bundle.
- Added security headers and a strict Content-Security-Policy in `vercel.json`.
- Removed hardcoded Supabase credentials from `vercel.json` build env and `src/lib/supabase.ts`.

### Phase 2 — Auth, redirects, and observability
- Replaced `localStorage` session persistence with a `Secure` + `SameSite=Strict` cookie adapter.
- Added `sanitizeRedirect()` to prevent open redirects on login/signup.
- Strip the password-reset `access_token` from the URL hash once consumed.
- Scrubbed PII from Sentry logs; disabled info-level Sentry forwarding.
- Masked all text and inputs in Sentry Session Replay.
- Guarded production console logging in `ErrorBoundary`, `PwaUpdatePrompt`, and `logger`.

### Phase 3 — Database RLS & business logic
- Fixed message attachment storage path to match RLS policy (`{userId}/{conversationId}/{messageId}/{file}`).
- Tightened messaging RLS policies for participants, reactions, and attachments.
- Fixed `qr_scans` SELECT policy to join `plants.current_owner_id`.
- Removed arbitrary anonymous write access to plant identification requests and dependent rows.
- Removed the hardcoded PromptPay fallback in checkout; checkout is blocked if the seller has no PromptPay ID.
- Strengthened Supabase password policy to 8+ chars with uppercase, lowercase, number, and symbol.

### Phase 4 — Build & deploy hardening
- `npm audit` reports 0 vulnerabilities.
- Source scan shows no committed API keys or tokens.

## Operational Follow-ups

1. **Rotate Upstash Redis token.** The previous `VITE_UPSTASH_REDIS_REST_TOKEN` was exposed in the browser bundle. Log in to the Upstash dashboard, rotate the token, then update the Supabase Edge Function secret:
   ```bash
   npx supabase secrets set UPSTASH_REDIS_REST_TOKEN=<new-token>
   ```

2. **Verify Resend sender domain.** Emails still send from `onboarding@resend.dev` and only reach the Resend account owner. Verify a custom domain in Resend and update `EMAIL_FROM`:
   ```bash
   npx supabase secrets set EMAIL_FROM=you@yourdomain.com
   ```

3. **Monitor CSP violations.** The current CSP is enforcing. Watch Sentry / browser console for any blocked resources and adjust `connect-src` / `img-src` / `script-src` in `vercel.json` if new third-party integrations are added.

4. **Custom domain for production.** Update `ALLOWED_ORIGINS` and Supabase `site_url` / `additional_redirect_urls` when a custom domain replaces the Vercel defaults.
