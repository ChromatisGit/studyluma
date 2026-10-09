// Worker bundled for workerd by classroom.workerd.test.ts; not part of the app.
import { ConflictError, NotFoundError } from "@chromatis/base/errors";
import {
  createCloudflareRuntimeHost,
  createRuntimeDurableObject,
  type DurableObjectNamespaceLike,
} from "@chromatis/base/stateful/cloudflare";
import { createClassroomService } from "../application/classroomService";
import { handleClassroomSocket } from "../application/socketRoute";
import { createClassroomRuntime } from "./classroomRuntime";

const definitions = [createClassroomRuntime()];
export const RuntimeInstanceObject = createRuntimeDurableObject(definitions);

type Env = { RUNTIME_OBJECTS: DurableObjectNamespaceLike };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const host = createCloudflareRuntimeHost(env.RUNTIME_OBJECTS, definitions);
    const service = createClassroomService(host);
    const url = new URL(request.url);
    if (url.pathname === "/classroom/ws") {
      return (
        (await handleClassroomSocket(request, service)) ??
        new Response(null, { status: 500 })
      );
    }
    // A thin RPC so the test process can use the service inside workerd.
    const op = url.pathname.replace("/api/", "");
    const args = (await request.json()) as unknown[];
    try {
      const fn = (
        service as unknown as Record<string, (...a: unknown[]) => unknown>
      )[op];
      const result =
        op === "exists"
          ? await host.exists(args[0] as { kind: string; id: string })
          : await fn?.(...args);
      return Response.json({ result: result ?? null });
    } catch (error) {
      const kind =
        error instanceof NotFoundError
          ? "not-found"
          : error instanceof ConflictError
            ? "conflict"
            : "error";
      return Response.json({ error: kind }, { status: 400 });
    }
  },
};
