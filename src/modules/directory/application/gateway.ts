import {
  RateLimited,
  type LookupLimiter,
  type RegisterResult,
  type SessionDirectory,
} from "../domain/directory";

/**
 * The HTTP face of the Session Directory.
 *
 *   GET    /{CODE}           Gateway: redirect to the instance's join page
 *   PUT    /sessions/{CODE}  an instance registers a session
 *   DELETE /sessions/{CODE}  an instance releases it
 *
 * Nobody holds a secret. Only addresses under the directory's own domain
 * (`*.studyluma.org`) are accepted, and the directory asks the instance
 * itself whether the session exists: a code is registered only if it
 * lives there and released only once it no longer does. Unknown,
 * malformed and expired codes are the same 404.
 */
export type GatewayOptions = {
  /** The domain whose subdomains may register, e.g. `studyluma.org`. */
  domain: string;
  /** Asks the instance at this address about a session; `unknown` if it can't tell. */
  sessionState(instanceUrl: string, code: string): Promise<SessionState>;
  /** Who is asking, for the lookup limit; set by the server entry. */
  clientKey(request: Request): string;
  /** Counts registration attempts per client; each attempt costs one request to an instance. */
  registrationLimiter?: LookupLimiter;
};

const notFound = () => new Response(null, { status: 404 });

export type SessionState = "live" | "gone" | "unknown";

/** `https://name.<domain>` only: the domain itself and deeper levels are not instances. */
export function isInstanceOf(domain: string, instanceUrl: string): boolean {
  try {
    const url = new URL(instanceUrl);
    const label = url.hostname.endsWith(`.${domain}`)
      ? url.hostname.slice(0, -(domain.length + 1))
      : "";
    return url.protocol === "https:" && /^[a-z0-9-]+$/.test(label);
  } catch {
    return false;
  }
}

/**
 * Asks an instance whether it runs a session (204 live, 404 gone). Redirects are not followed
 * and the wait is short, so a slow or hostile answer costs little.
 */
export function createSessionProbe(
  fetcher: typeof fetch = fetch,
): GatewayOptions["sessionState"] {
  return async (instanceUrl, code) => {
    try {
      const response = await fetcher(
        `${instanceUrl}${SESSION_PROBE_PATH}/${encodeURIComponent(code)}`,
        { redirect: "manual", signal: AbortSignal.timeout(3000) },
      );
      return response.status === 204
        ? "live"
        : response.status === 404
          ? "gone"
          : "unknown";
    } catch {
      return "unknown";
    }
  };
}

/** Where an instance confirms a live session: 204 if it exists, 404 if not. */
export const SESSION_PROBE_PATH = "/.well-known/studyluma-session";

const REGISTER_STATUS: Record<RegisterResult, number> = {
  registered: 204,
  conflict: 409,
  invalid: 400,
};

async function instanceUrlOf(request: Request): Promise<string> {
  const body = (await request.json().catch(() => null)) as {
    instanceUrl?: unknown;
  } | null;
  return typeof body?.instanceUrl === "string" ? body.instanceUrl : "";
}

export function createGateway(
  directory: SessionDirectory,
  options: GatewayOptions,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const { pathname } = new URL(request.url);
    const segments = pathname.split("/").filter(Boolean);

    if (segments[0] === "sessions" && segments.length === 2) {
      const registration = {
        code: segments[1] ?? "",
        instanceUrl: await instanceUrlOf(request),
      };
      if (!isInstanceOf(options.domain, registration.instanceUrl)) {
        return new Response(null, { status: 400 });
      }
      if (request.method !== "PUT" && request.method !== "DELETE") {
        return new Response(null, { status: 405 });
      }
      const limiter = options.registrationLimiter;
      const client = options.clientKey(request);
      if (limiter) {
        if (!limiter.allowed(client)) {
          return new Response(null, {
            status: 429,
            headers: { "Retry-After": "60" },
          });
        }
        limiter.fail(client);
      }
      const state = await options.sessionState(
        registration.instanceUrl,
        registration.code,
      );
      if (request.method === "PUT") {
        return new Response(null, {
          status:
            state === "live"
              ? REGISTER_STATUS[directory.register(registration)]
              : state === "gone"
                ? 403
                : 503,
        });
      }
      if (state === "gone") {
        directory.release(registration);
      }
      return new Response(null, { status: 204 });
    }

    if (
      request.method === "GET" &&
      segments.length === 1 &&
      segments[0] !== undefined
    ) {
      try {
        const target = directory.resolve(
          segments[0],
          options.clientKey(request),
        );
        return target
          ? new Response(null, {
              status: 302,
              headers: {
                Location: `${target.instanceUrl}/join/${target.code}`,
                "Cache-Control": "no-store",
                "Referrer-Policy": "no-referrer",
              },
            })
          : notFound();
      } catch (error) {
        if (error instanceof RateLimited) {
          return new Response(null, {
            status: 429,
            headers: { "Retry-After": "60" },
          });
        }
        throw error;
      }
    }
    return notFound();
  };
}
