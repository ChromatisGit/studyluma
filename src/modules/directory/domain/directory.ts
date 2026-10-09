/**
 * The Session Directory: temporary routing from a join code to the
 * StudyLuma instance that runs the Classroom Session. It knows nothing
 * else about a session and forgets it when it ends or expires.
 */
export type DirectoryOptions = {
  /** The canonical form of a typed join code, or null if it can't be one. */
  normalizeCode(input: string): string | null;
  /** Counts failed lookups per client. */
  limiter: LookupLimiter;
  now?: () => number;
  /** How long an entry lives unless released earlier. */
  ttlMs?: number;
};

export type LookupLimiter = {
  allowed(client: string): boolean;
  fail(client: string): void;
};

export type Registration = { code: string; instanceUrl: string };

export type RegisterResult = "registered" | "conflict" | "invalid";

export type SessionDirectory = {
  /**
   * Claims a code for an instance. The same instance may register a code
   * again (it refreshes); a live code of another instance is a conflict.
   */
  register(registration: Registration): RegisterResult;
  /** Frees a code, only for the instance that holds it. */
  release(registration: Registration): boolean;
  /**
   * The instance responsible for a code, or null. Malformed, unknown and
   * expired codes are indistinguishable. Throws `RateLimited` when a
   * client has guessed too often.
   */
  resolve(
    code: string,
    client: string,
  ): { code: string; instanceUrl: string } | null;
  /** Drops expired entries. */
  sweep(): number;
  size(): number;
};

export class RateLimited extends Error {
  constructor() {
    super("Too many attempts");
  }
}

export const DEFAULT_DIRECTORY_TTL_MS = 12 * 60 * 60 * 1000;

/** A base address of an instance: http(s), no credentials, no path. */
export function normalizeInstanceUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function createSessionDirectory(
  options: DirectoryOptions,
): SessionDirectory {
  const normalizeJoinCode = options.normalizeCode;
  const now = options.now ?? Date.now;
  const ttlMs = options.ttlMs ?? DEFAULT_DIRECTORY_TTL_MS;
  const limiter = options.limiter;
  const entries = new Map<string, { instanceUrl: string; expiresAt: number }>();

  function live(code: string) {
    const entry = entries.get(code);
    if (entry && entry.expiresAt <= now()) {
      entries.delete(code);
      return undefined;
    }
    return entry;
  }

  return {
    register(registration) {
      const code = normalizeJoinCode(registration.code);
      const instanceUrl = normalizeInstanceUrl(registration.instanceUrl);
      if (!code || !instanceUrl) {
        return "invalid";
      }
      const existing = live(code);
      if (existing && existing.instanceUrl !== instanceUrl) {
        return "conflict";
      }
      entries.set(code, { instanceUrl, expiresAt: now() + ttlMs });
      return "registered";
    },

    release(registration) {
      const code = normalizeJoinCode(registration.code);
      const instanceUrl = normalizeInstanceUrl(registration.instanceUrl);
      const existing = code ? live(code) : undefined;
      if (!code || !existing || existing.instanceUrl !== instanceUrl) {
        return false;
      }
      entries.delete(code);
      return true;
    },

    resolve(code, client) {
      if (!limiter.allowed(client)) {
        throw new RateLimited();
      }
      const normalized = normalizeJoinCode(code);
      const entry = normalized ? live(normalized) : undefined;
      if (!entry) {
        limiter.fail(client);
        return null;
      }
      return { code: normalized as string, instanceUrl: entry.instanceUrl };
    },

    sweep() {
      let removed = 0;
      for (const code of [...entries.keys()]) {
        if (!live(code)) {
          removed += 1;
        }
      }
      return removed;
    },

    size: () => entries.size,
  };
}
