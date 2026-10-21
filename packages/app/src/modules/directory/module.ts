import { defineModule, z } from "@chromatis/base/module";

/**
 * The gateway on `studyluma.org`: `/CODE` leads to the instance running the
 * session, and instances check their codes at `/sessions/CODE`. Only the
 * Demo runs it; every other instance disables it (its `/:code` is the
 * classroom's join page).
 *
 * WORKAROUND, not the final Directory: see `application/instanceGateway.ts`.
 */
export default defineModule({
  name: "directory",
  config: {
    schema: z
      .object({
        instances: z
          .array(z.string().url())
          .default([])
          .describe(
            "Base addresses of the StudyLuma instances the gateway asks about a code, e.g. https://holst.studyluma.org.",
          ),
      })
      .strict(),
  },
  routes: [
    {
      path: ":code",
      file: "@studyluma/app/app/routes/gateway",
      server: "@studyluma/app/app/routes/gateway.server",
      id: "gateway",
    },
    {
      path: "sessions/:code",
      api: true,
      file: "@studyluma/app/app/routes/gatewaySessions",
    },
  ],
});
