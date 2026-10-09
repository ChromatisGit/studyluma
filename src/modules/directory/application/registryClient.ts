/** What an instance needs to announce a session (the classroom's `SessionRegistry`). */
export type DirectoryRegistry = {
  register(code: string): Promise<"registered" | "conflict" | "unavailable">;
  release(code: string): Promise<void>;
};

/** Where an instance registers its sessions, and how it is reached. */
export type DirectoryConfig = {
  /** Base address of the Session Directory, e.g. https://studyluma.org */
  directoryUrl: string;
  /** This instance's public base address, which join links point to. */
  instanceUrl: string;
};

export type RegistryEnv = Record<string, string | undefined>;

/** Reads `DIRECTORY_URL` and `PUBLIC_URL`; none set means local only. */
export function directoryConfigFrom(env: RegistryEnv): DirectoryConfig | null {
  const { DIRECTORY_URL, PUBLIC_URL } = env;
  return DIRECTORY_URL && PUBLIC_URL
    ? { directoryUrl: DIRECTORY_URL, instanceUrl: PUBLIC_URL }
    : null;
}

/**
 * Registers sessions with the Session Directory. A session never depends
 * on it: when the directory is unreachable the session still works through
 * its direct link, only the short address is missing. A code the directory
 * gives to another instance reports `conflict`, so the caller draws again.
 */
export function createDirectoryRegistry(
  config: DirectoryConfig,
  fetcher: typeof fetch = fetch,
): DirectoryRegistry {
  const base = config.directoryUrl.replace(/\/+$/, "");
  const call = (method: "PUT" | "DELETE", code: string) =>
    fetcher(`${base}/sessions/${encodeURIComponent(code)}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instanceUrl: config.instanceUrl }),
      signal: AbortSignal.timeout(3000),
    });

  return {
    async register(code) {
      try {
        const response = await call("PUT", code);
        return response.status === 409
          ? "conflict"
          : response.ok
            ? "registered"
            : "unavailable";
      } catch {
        return "unavailable";
      }
    },
    async release(code) {
      try {
        await call("DELETE", code);
      } catch {
        /* The entry expires by itself. */
      }
    },
  };
}
