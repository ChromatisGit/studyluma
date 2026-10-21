import type { DataArgs } from "@chromatis/base/data";
import {
  clientKey,
  instanceGateway,
  lookupLimiter,
} from "../../src/modules/directory/server/gateway.server";

/**
 * `studyluma.org/CODE`: a redirect to the join page of the instance running
 * the session. An unknown code shows the gateway page instead.
 */
export async function loader({ params, request }: DataArgs) {
  const client = clientKey(request);
  if (!lookupLimiter.allowed(client)) {
    return { code: params.code ?? "", failure: "tooMany" as const };
  }
  const found = await instanceGateway().find(params.code ?? "");
  if (!found) {
    lookupLimiter.fail(client);
    return { code: params.code ?? "", failure: "unknown" as const };
  }
  throw new Response(null, {
    status: 302,
    headers: {
      Location: `${found.instanceUrl}/${found.code}`,
      "Cache-Control": "no-store",
    },
  });
}
