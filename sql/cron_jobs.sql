-- ============================================================
-- Scheduled cron jobs (requires pg_cron extension)
-- Run once after pg_cron is enabled: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- ============================================================

-- Delete closed quiz sessions that have been inactive for 24 hours.
-- Runs every hour.
SELECT cron.schedule(
  'cleanup-stale-quiz-sessions',
  '0 * * * *',
  $$DELETE FROM quiz_sessions WHERE phase = 'closed' AND updated_at < now() - INTERVAL '24 hours'$$
);
