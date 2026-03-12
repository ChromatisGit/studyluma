/**
 * GET /api/stream/quiz
 *
 * Student polling endpoint. Returns a StudentSnapshot with the active quiz
 * state for the user's enrolled courses (null if no active quiz).
 * Clients poll every ~1.5s.
 */

import { getSession, assertLoggedIn } from "@services/authService";
import { getActiveQuizForUser } from "@services/quizService";
import type { StudentSnapshot } from "@schema/streamTypes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request): Promise<Response> {
  const session = await getSession();
  assertLoggedIn(session);

  const quiz = await getActiveQuizForUser(session.user);

  const snapshot: StudentSnapshot = {
    type: "INIT",
    quiz,
    serverNow: new Date().toISOString(),
  };

  return Response.json(snapshot);
}
