/**
 * Rate-limiting configuration.
 *
 * These values control how aggressive the system is at blocking
 * brute-force authentication attempts. Tune based on production metrics.
 */

/** Max attempts per (access_code, IP) pair within the window before lockout */
export const MAX_PER_CODE_IP = 5;

/** Max attempts per IP (across all access codes) within the window before lockout */
export const MAX_PER_IP = 20;

/** Duration of the sliding window for counting attempts (10 minutes) */
export const WINDOW_MS = 10 * 60 * 1000;

/** Duration of a lockout after exceeding max attempts (15 minutes) */
export const LOCK_MS = 15 * 60 * 1000;
