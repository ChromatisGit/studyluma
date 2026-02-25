-- ============================================================
-- Scheduled cron jobs (requires pg_cron extension)
-- Run once after pg_cron is enabled: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- ============================================================

-- Delete slide sessions whose heartbeat has not been refreshed in 48 hours.
-- Runs every hour.
SELECT cron.schedule(
  'cleanup-stale-slide-sessions',
  '0 * * * *',
  $$DELETE FROM slide_sessions WHERE last_heartbeat < now() - INTERVAL '48 hours'$$
);
