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
  serverHook: "server/hook.ts",
  // Join links are `<host>/CODE`; the loader answers 404 for anything that is
  // not shaped like a join code, and static routes win over `:code`.
  routes: [
    { path: "join", file: "@studyluma/app/app/routes/join", id: "join-form" },
    { path: ":code", file: "@studyluma/app/app/routes/join" },
    { path: "classroom", file: "@studyluma/app/app/routes/classroom" },
    {
      path: ".well-known/studyluma-session/:code",
      file: "@studyluma/app/app/routes/sessionProbe",
    },
  ],
});
