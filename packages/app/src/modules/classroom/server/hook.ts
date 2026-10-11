import type { ServerHook } from "@chromatis/base/server-hook";
import { app } from "chromatis-config";
// The hook is the one place that starts the server side of the application, so
// it reaches the catalog's server entry, which the catalog's public index does
// not (and must not) export to browser code.
// eslint-disable-next-line chromatis/dependencies
import { verifyCatalog } from "../../catalog/server/catalog.server";
import { createDirectoryRegistry, directoryConfigFor } from "../../directory";
import {
  CLASSROOM_SOCKET_ROUTE,
  classroomDefinitions,
  configureClassroom,
  handleClassroomSocket,
  classroomSettings,
} from "./classroom.server";

const settings = classroomSettings();

const hook: ServerHook<ReturnType<typeof configureClassroom>> = {
  definitions: classroomDefinitions(settings),
  createService(host) {
    // An unusable catalog stops the server at startup, not at the first request.
    verifyCatalog();
    // Instances under studyluma.org announce their sessions to the Directory.
    const directory = directoryConfigFor(app);
    return configureClassroom(
      host,
      settings,
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
