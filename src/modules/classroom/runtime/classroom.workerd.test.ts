import { startWorkerd } from "@chromatis/base/stateful/workerd";
import type { ClassroomService } from "../application/classroomService";
import {
  cookieOf,
  runClassroomSuite,
  wrapSocket,
  type SocketLike,
} from "./classroom.suite";

/** The Classroom against real Durable Objects and WebSockets in workerd. */
runClassroomSuite("Cloudflare Runtime Host (workerd)", async () => {
  const worker = await startWorkerd({
    entrypoint: new URL("./classroom.workerd.entry.ts", import.meta.url)
      .pathname,
    durableObjects: { RUNTIME_OBJECTS: "RuntimeInstanceObject" },
  });
  async function rpc(op: string, ...args: unknown[]): Promise<unknown> {
    const response = await worker.dispatchFetch(`http://worker/api/${op}`, {
      method: "POST",
      body: JSON.stringify(args),
    });
    const body = (await response.json()) as {
      result?: unknown;
      error?: string;
    };
    if (body.error) {
      throw new Error(body.error);
    }
    return body.result;
  }
  const service = new Proxy({} as ClassroomService, {
    get:
      (_target, op: string) =>
      (...args: unknown[]) =>
        rpc(op, ...args),
  });
  return {
    runtime: {
      exists: async (address) => (await rpc("exists", address)) === true,
    },
    service,
    async open(auth) {
      const response = await worker.dispatchFetch(
        "http://worker/classroom/ws",
        {
          headers: { upgrade: "websocket", cookie: cookieOf(auth) },
        },
      );
      const socket = response.webSocket;
      if (!socket) {
        throw new Error(`upgrade failed: ${response.status}`);
      }
      const client = wrapSocket(socket as unknown as SocketLike);
      socket.accept();
      return client;
    },
    dispose: () => worker.dispose(),
  };
});
