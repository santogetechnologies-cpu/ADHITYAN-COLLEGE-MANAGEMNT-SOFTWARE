-- Step 34 (optional automation): run the fee-reminder job every day at 09:00 India time (03:30 UTC).
-- It only does something when an administrator switches "Automatic fee reminders" on in the app.
-- If the pg_cron extension is not available on your plan, this step is skipped with a notice and nothing breaks;
-- you can instead schedule the notifications-dispatch function with {"task":"reminders"} (see the runbook).
SET search_path = public, extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'erp-fee-reminders';
    PERFORM cron.schedule('erp-fee-reminders', '30 3 * * *', 'SELECT public.fee_reminders_auto()');
    RAISE NOTICE 'Daily fee-reminder job scheduled.';
  ELSE
    RAISE NOTICE 'pg_cron is not available: schedule notifications-dispatch with {"task":"reminders"} instead.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Daily job not scheduled (%): schedule notifications-dispatch with {"task":"reminders"} instead.', SQLERRM;
END $$;
