import { getSession } from "@core/index.server";
import { assertAdminAccess } from "@core/auth/guards";
import { upsertSlideState } from "@services/slideService";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function action({ request }: { request: Request }) {
  const session = await getSession(request);
  assertAdminAccess(session);
  const body = await request.json() as Record<string, unknown>;

  if (body.intent !== "broadcast-state") {
    return json({ ok: false, error: "Unknown action" }, 400);
  }

  const courseId = text(body.courseId);
  const state = {
    slideIndex: Number(body.slideIndex),
    blackout: Boolean(body.blackout),
    macroState: typeof body.macroState === "object" && body.macroState !== null
      ? body.macroState as Record<string, string>
      : {},
    revealStep: Number(body.revealStep),
  };

  await upsertSlideState(courseId, state);
  return json({ ok: true });
}
