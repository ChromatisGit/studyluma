import { createBunRuntimeHost } from "@chromatis/base/stateful/bun";
import { createClassroomService } from "../application/classroomService";
import { handleClassroomSocket } from "../application/socketRoute";
import { createClassroomRuntime } from "./classroomRuntime";
import { cookieOf, runClassroomSuite, wrapSocket } from "./classroom.suite";

runClassroomSuite("Bun Runtime Host", async () => {
  const host = createBunRuntimeHost([createClassroomRuntime()]);
  const service = createClassroomService(host);
  // The same socket route the Bun server entry uses.
  const server = Bun.serve({
    port: 0,
    fetch: (request) => handleClassroomSocket(request, service),
    websocket: host.websocket as never,
  });
  host.attachServer(server as never);
  return {
    runtime: host,
    service,
    async open(auth) {
      const socket = new WebSocket(
        `ws://localhost:${server.port}/classroom/ws`,
        { headers: { Cookie: cookieOf(auth) } } as never,
      );
      const client = wrapSocket(socket as never);
      await new Promise<void>((resolve, reject) => {
        socket.addEventListener("open", () => resolve(), { once: true });
        socket.addEventListener(
          "error",
          () => reject(new Error("upgrade refused")),
          { once: true },
        );
      });
      return client;
    },
    async dispose() {
      await server.stop(true);
    },
  };
});
