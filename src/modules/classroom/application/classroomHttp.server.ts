import type { Snapshot } from "../domain/protocol";
import type { Intent } from "../domain/session";
import { readClassroomAuth } from "../infrastructure/classroomCookie";
import { classroom } from "../infrastructure/classroomServer.server";
import { RATE_LIMITED } from "./classroomService";

/**
 * Failures as HTTP answers. An unknown, ended and expired code are the
 * same 404, so nothing reveals that a session once existed.
 */
export function classroomError(error: unknown): Response {
  // By error code: the service may come from another copy of its module
  // (the server entry), so class identity cannot be relied on.
  const code = (error as { code?: unknown } | null)?.code;
  switch (code) {
    case RATE_LIMITED:
      return new Response(null, {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    case "not_found":
      return new Response(null, { status: 404 });
    case "permission_denied":
      return new Response(null, { status: 403 });
    case "validation_failed":
      return new Response(null, { status: 400 });
    case "conflict":
      return new Response(null, { status: 409 });
    default:
      throw error;
  }
}

/**
 * Applies an intent as the browser's own session participant. Without a
 * running session the answer is 409: start the classroom first.
 */
export async function actInSession(
  request: Request,
  intent: Intent,
): Promise<Snapshot> {
  const auth = readClassroomAuth(request);
  if (!auth) {
    throw new Response(null, { status: 409 });
  }
  try {
    return await classroom().act(auth, intent);
  } catch (error) {
    throw classroomError(error);
  }
}
