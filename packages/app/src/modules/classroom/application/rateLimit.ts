/**
 * Sliding-window limiter for join-code lookups. Only failures are counted,
 * so a class behind one school router can join freely while somebody
 * guessing codes is stopped quickly.
 */
export type FailureLimiter = {
  /** Whether this client may try right now. */
  allowed(key: string): boolean;
  fail(key: string): void;
  succeed(key: string): void;
};

export function createFailureLimiter(
  options: { maxFailures?: number; windowMs?: number; now?: () => number } = {},
): FailureLimiter {
  const maxFailures = options.maxFailures ?? 20;
  const windowMs = options.windowMs ?? 60_000;
  const now = options.now ?? Date.now;
  const failures = new Map<string, number[]>();

  function recent(key: string): number[] {
    const cutoff = now() - windowMs;
    const list = (failures.get(key) ?? []).filter((time) => time > cutoff);
    if (list.length === 0) {
      failures.delete(key);
    } else {
      failures.set(key, list);
    }
    return list;
  }

  return {
    allowed: (key) => recent(key).length < maxFailures,
    fail(key) {
      failures.set(key, [...recent(key), now()]);
    },
    succeed() {
      // A success does not forgive earlier guesses.
    },
  };
}
