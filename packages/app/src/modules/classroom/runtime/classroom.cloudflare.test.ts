import { createInProcessCloudflareHost } from "@chromatis/base/stateful/testing";
import { createClassroomService } from "../application/classroomService";
import { handleClassroomSocket } from "../application/socketRoute";
import { defaultClassroomSettings } from "../infrastructure/classroomConfig";
import { createClassroomRuntime } from "./classroomRuntime";
import { cookieOf, runClassroomSuite, wrapSocket } from "./classroom.suite";

type AcceptableSocket = Parameters<typeof wrapSocket>[0] & { accept(): void };

runClassroomSuite(
  "Cloudflare Runtime Host (Durable Object harness)",
  async () => {
    const { host } = createInProcessCloudflareHost([
      createClassroomRuntime({ settings: defaultClassroomSettings }),
    ]);
    const service = createClassroomService(host);
    return {
      runtime: host,
      service,
      async open(auth) {
        // The same socket route the Worker entry uses.
        const response = await handleClassroomSocket(
          new Request("http://worker/classroom/ws", {
            headers: { upgrade: "websocket", cookie: cookieOf(auth) },
          }),
          service,
        );
        const socket = (response as unknown as { webSocket: AcceptableSocket })
          .webSocket;
        const client = wrapSocket(socket);
        socket.accept();
        return client;
      },
      async dispose() {},
    };
  },
);
