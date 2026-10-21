import type { ApiContext } from "@chromatis/base/api";
import {
  clientKey,
  instanceGateway,
  registrationLimiter,
} from "../../src/modules/directory/server/gateway.server";

async function instanceUrlOf(request: Request): Promise<string> {
  const body = (await request.json().catch(() => null)) as {
    instanceUrl?: unknown;
  } | null;
  return typeof body?.instanceUrl === "string" ? body.instanceUrl : "";
}

/** An instance checks a new code: 204 if it may use it, 409 to draw again. */
export async function PUT({ params, request }: ApiContext) {
  const client = clientKey(request);
  if (!registrationLimiter.allowed(client)) {
    return new Response(null, {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }
  registrationLimiter.fail(client);
  const status = await instanceGateway().register(
    params.code ?? "",
    await instanceUrlOf(request),
  );
  return new Response(null, { status });
}

/** The gateway keeps no entries, so there is nothing to release. */
export function DELETE() {
  return new Response(null, { status: 204 });
}
