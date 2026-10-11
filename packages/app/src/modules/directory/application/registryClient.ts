import { isInstanceOf } from "./gateway";

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

/**
 * The central Session Directory is a StudyLuma constant, not configuration:
 * `studyluma.org` redirects `studyluma.org/CODE` to the instance running the
 * session.
 */
export const DIRECTORY_DOMAIN = "studyluma.org";
export const DIRECTORY_URL = `https://${DIRECTORY_DOMAIN}`;

/** What the Directory rule needs to know about this instance (`app` of `chromatis-config`). */
export type InstanceAddress = { domain: string; publicUrl: string };

/**
 * Whether this instance is announced to the Directory: its domain is a
 * subdomain of the Directory's (`holst.studyluma.org`). Any other domain is
 * its own gateway: no registration, join links point at the instance itself.
 */
export function usesDirectory(app: InstanceAddress): boolean {
  return isInstanceOf(DIRECTORY_DOMAIN, `https://${app.domain}`);
}

/** Where an instance registers its sessions, or null when it is its own gateway. */
export function directoryConfigFor(
  app: InstanceAddress,
): DirectoryConfig | null {
  return usesDirectory(app)
    ? { directoryUrl: DIRECTORY_URL, instanceUrl: app.publicUrl }
    : null;
}

/** Where teachers' join links point: the Directory, or null for this instance's own address. */
export function joinOriginFor(app: InstanceAddress): string | null {
  return usesDirectory(app) ? DIRECTORY_URL : null;
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
