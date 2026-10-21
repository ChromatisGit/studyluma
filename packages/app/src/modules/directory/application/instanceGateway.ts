import { normalizeInstanceUrl } from "../domain/directory";
import type { SessionState } from "./gateway";

/**
 * WORKAROUND, not the final Directory: the gateway on `studyluma.org` keeps
 * no registrations. Workers have no memory shared between isolates and the
 * Stateful Runtime has no durable storage yet, so it asks every instance it
 * knows (`config/directory.toml`) whether it runs the code. The final
 * Directory (`createGateway` over `createSessionDirectory`) takes open
 * registrations from any `*.studyluma.org` and needs that storage.
 */
export type InstanceGatewayOptions = {
  /** The instances' base addresses, e.g. https://holst.studyluma.org. */
  instances: readonly string[];
  /** The canonical form of a typed join code, or null if it can't be one. */
  normalizeCode(input: string): string | null;
  /** Asks an instance about a session; `unknown` if it can't tell. */
  sessionState(instanceUrl: string, code: string): Promise<SessionState>;
};

export type InstanceGateway = {
  /** The instance running the code, or null for unknown and malformed codes. */
  find(code: string): Promise<{ code: string; instanceUrl: string } | null>;
  /**
   * What a registration from `instanceUrl` gets: 204 if the code is live
   * there and nowhere else, 409 if another instance runs it too (the caller
   * draws again), 403 if it is not live there, 400 for an unknown instance
   * or a malformed code, 503 if the instance could not be asked.
   */
  register(code: string, instanceUrl: string): Promise<number>;
};

export function createInstanceGateway(
  options: InstanceGatewayOptions,
): InstanceGateway {
  const instances = options.instances.flatMap((url) => {
    const normalized = normalizeInstanceUrl(url);
    return normalized ? [normalized] : [];
  });

  const states = (code: string, among: readonly string[]) =>
    Promise.all(among.map((url) => options.sessionState(url, code)));

  return {
    async find(input) {
      const code = options.normalizeCode(input);
      if (!code) {
        return null;
      }
      const found = await states(code, instances);
      const index = found.indexOf("live");
      const instanceUrl = index === -1 ? undefined : instances[index];
      return instanceUrl ? { code, instanceUrl } : null;
    },

    async register(input, url) {
      const code = options.normalizeCode(input);
      const instanceUrl = normalizeInstanceUrl(url);
      if (!code || !instanceUrl || !instances.includes(instanceUrl)) {
        return 400;
      }
      const own = await options.sessionState(instanceUrl, code);
      if (own !== "live") {
        return own === "gone" ? 403 : 503;
      }
      const others = await states(
        code,
        instances.filter((other) => other !== instanceUrl),
      );
      return others.includes("live") ? 409 : 204;
    },
  };
}
