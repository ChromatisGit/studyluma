/**
 * GET /api/stream/presentation?courseId=...
 *
 * Admin polling endpoint. Returns an AdminSnapshot with the current slide
 * state (from DB) and active quiz results (if any). Clients poll every ~1.5s.
 */

import { getSession, assertAdminAccess } from "@services/authService";
import { getActiveQuizResults } from "@services/quizService";
import { getSlideState } from "@services/slideService";
import type { AdminSnapshot } from "@schema/streamTypes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const session = await getSession();
  assertAdminAccess(session);

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId");
  if (!courseId) {
    return new Response("Missing courseId", { status: 400 });
  }

  const [slideState, quiz] = await Promise.all([
    getSlideState(courseId),
    getActiveQuizResults(courseId, session.user),
  ]);

  const snapshot: AdminSnapshot = {
    type: "INIT",
    slideIndex: slideState.slideIndex,
    blackout: slideState.blackout,
    macroState: slideState.macroState,
    quiz,
  };

  return Response.json(snapshot);
}
