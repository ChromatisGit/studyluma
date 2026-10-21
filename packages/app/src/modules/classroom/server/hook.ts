import type { ServerHook } from "@chromatis/base/server-hook";
import { devOpen } from "@chromatis/base/dev";
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
  configureTeacherPassword,
  handleClassroomSocket,
  classroomSettings,
  teacherPassword,
} from "./classroom.server";

const settings = classroomSettings();

// An unusable catalog stops the server at startup, not at the first request.
// Loading it here, while the module is evaluated, also keeps decoding and
// parsing it out of the first request's CPU budget (10 ms on Workers Free).
verifyCatalog();

const hook: ServerHook<ReturnType<typeof configureClassroom>> = {
  definitions: classroomDefinitions(settings),
  createService(host, env) {
    configureTeacherPassword(env.TEACHER_PASSWORD);
    if (devOpen(env)) {
      console.info(
        "[studyluma] dev --open: the login is off, the viewer role is a stand-in cookie and a browser without it is a teacher.",
      );
    } else if (!teacherPassword()) {
      console.warn(
        "[studyluma] No TEACHER_PASSWORD: the viewer role is a stand-in cookie, a browser without it is a teacher and receives all answers. Do not run this instance for real students.",
      );
    }
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
