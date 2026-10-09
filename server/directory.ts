/**
 * Session Directory and Gateway for studyluma.org: `/{CODE}` redirects to
 * the instance running that Classroom Session, and StudyLuma instances
 * register their sessions here. It holds only temporary routing entries in
 * memory. Run it with `bun server/directory.ts`.
 *
 * Only instances at https://<name>.<DIRECTORY_DOMAIN> (default studyluma.org)
 * can register, and only for sessions they actually run. Behind a reverse
 * proxy set TRUST_PROXY=1.
 */
import {
  createFailureLimiter,
  normalizeJoinCode,
} from "../src/modules/classroom/server/classroom.server";
import {
  createGateway,
  createSessionDirectory,
  createSessionProbe,
} from "../src/modules/directory";

const domain = process.env.DIRECTORY_DOMAIN ?? "studyluma.org";
const trustProxy = process.env.TRUST_PROXY === "1";

const directory = createSessionDirectory({
  normalizeCode: normalizeJoinCode,
  limiter: createFailureLimiter(),
});
setInterval(() => directory.sweep(), 60_000).unref();

const gateway = createGateway(directory, {
  domain,
  sessionState: createSessionProbe(),
  registrationLimiter: createFailureLimiter({ maxFailures: 60 }),
  clientKey: (request) => request.headers.get("x-studyluma-client") ?? "local",
});

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3001),
  fetch(request, serverRef) {
    const forwarded = request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim();
    const headers = new Headers(request.headers);
    // The client key is set here, never taken from the request as sent.
    headers.set(
      "x-studyluma-client",
      trustProxy && forwarded
        ? forwarded
        : (serverRef.requestIP(request)?.address ?? "local"),
    );
    return gateway(new Request(request, { headers }));
  },
});
console.log(`Session Directory listening on http://localhost:${server.port}`);
