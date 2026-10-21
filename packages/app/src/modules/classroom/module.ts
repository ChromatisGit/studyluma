import { defineModule } from "@chromatis/base/module";
import { classroomConfigSchema } from "./infrastructure/classroomConfig";

/**
 * Sessions are Stateful Runtime instances of kind "classroom". The server hook
 * is the application's one hook: it also verifies the catalog at startup and
 * announces sessions to the Session Directory when the instance's domain is
 * under studyluma.org (see the directory module).
 */
export default defineModule({
  name: "classroom",
  config: { schema: classroomConfigSchema },
  runtime: ["classroom"],
  // Without it every visitor is a teacher; an instance for real students
  // cannot be deployed without it.
  secrets: [
    {
      name: "TEACHER_PASSWORD",
      description: "The teacher's login password",
      required: "production",
    },
  ],
  serverHook: "server/hook.ts",
  // Join links are `<host>/CODE`; the loader answers 404 for anything that is
  // not shaped like a join code, and static routes win over `:code`.
  routes: [
    {
      path: "join",
      file: "@studyluma/app/app/routes/join",
      server: "@studyluma/app/app/routes/join.server",
      id: "join-form",
    },
    {
      path: ":code",
      file: "@studyluma/app/app/routes/join",
      server: "@studyluma/app/app/routes/join.server",
    },
    {
      path: "classroom",
      api: true,
      file: "@studyluma/app/app/routes/classroom",
    },
    // Server entries answer the socket before the router; declaring it puts
    // it in front of the static files on Cloudflare.
    {
      path: "classroom/ws",
      api: true,
      file: "@studyluma/app/app/routes/classroomSocket",
    },
    {
      path: ".well-known/studyluma-session/:code",
      api: true,
      file: "@studyluma/app/app/routes/sessionProbe",
    },
  ],
});
