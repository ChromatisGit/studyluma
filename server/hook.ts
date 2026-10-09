import type { ServerHook } from "@chromatis/base/server-hook";
import {
  createDirectoryRegistry,
  directoryConfigFrom,
} from "../src/modules/directory";
import {
  CLASSROOM_SOCKET_ROUTE,
  classroomDefinitions,
  configureClassroom,
  handleClassroomSocket,
} from "../src/modules/classroom/server/classroom.server";

const hook: ServerHook<ReturnType<typeof configureClassroom>> = {
  definitions: classroomDefinitions,
  createService(host, env) {
    const directory = directoryConfigFrom(env);
    return configureClassroom(
      host,
      directory ? createDirectoryRegistry(directory) : undefined,
    );
  },
  realtimeRoute: CLASSROOM_SOCKET_ROUTE,
  socket: handleClassroomSocket,
  sweep: async (service) => {
    await service.sweep();
  },
};

export default hook;
