import { moduleConfig } from "@chromatis/base/module";
import { config } from "chromatis-config";
import { createFailureLimiter, normalizeJoinCode } from "../../classroom";
import { createSessionProbe } from "../application/gateway";
import {
  createInstanceGateway,
  type InstanceGateway,
} from "../application/instanceGateway";
import directoryModule from "../module";

let gateway: InstanceGateway | undefined;

/** The gateway over the instances of `config/directory.toml`. */
export function instanceGateway(): InstanceGateway {
  gateway ??= createInstanceGateway({
    instances: moduleConfig(directoryModule, config).instances,
    normalizeCode: normalizeJoinCode,
    sessionState: createSessionProbe(),
  });
  return gateway;
}

/** Failed lookups per client, so nobody walks the code space through the gateway. */
export const lookupLimiter = createFailureLimiter();
/** Registrations per client; each one costs requests to the instances. */
export const registrationLimiter = createFailureLimiter({ maxFailures: 60 });

/** Who is asking; the server entry sets the header, never the caller. */
export const clientKey = (request: Request): string =>
  request.headers.get("x-chromatis-client") ?? "local";
