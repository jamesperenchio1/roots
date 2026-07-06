-- Phase 1 security hardening: cron schedule for send-notification-email.
-- IMPORTANT: replace CRON_SECRET_PLACEHOLDER with the real CRON_SECRET before
-- this cron fires, or reschedule via the Supabase dashboard with the secret.
-- The function rejects requests without a valid CRON_SECRET header.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-notification-email') THEN
    PERFORM cron.unschedule('send-notification-email');
  END IF;
END $$;

SELECT cron.schedule(
  'send-notification-email',
  '*/2 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://daacilgagkphafpjdcte.supabase.co/functions/v1/send-notification-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer CRON_SECRET_PLACEHOLDER"}'::jsonb
    ) AS request_id;
  $$
);
