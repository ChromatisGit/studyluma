import { NotFoundError } from "@chromatis/base/errors";
import { readClassroomAuth } from "../infrastructure/classroomCookie";
import type { ClassroomService } from "./classroomService";

/** The path server entries answer themselves, before the Website's router. */
export const CLASSROOM_SOCKET_ROUTE = "/classroom/ws";

/**
 * Upgrades a request to the realtime connection of the browser's Classroom
 * Session. The credential is the HttpOnly cookie; it never travels in the
 * URL. Returns the response to send, or `undefined` when the Runtime Host
 * already completed the upgrade (Bun).
 *
 * A browser opens a WebSocket from any page, so the Origin must be this
 * site: the cookie alone does not make a cross-site page the user.
 */
export async function handleClassroomSocket(
  request: Request,
  service: ClassroomService,
): Promise<Response | undefined> {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response(null, { status: 426 });
  }
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return new Response(null, { status: 403 });
  }
  const auth = readClassroomAuth(request);
  if (!auth) {
    return new Response(null, { status: 401 });
  }
  try {
    return await service.connect(auth, request);
  } catch (error) {
    if (error instanceof NotFoundError) {
      // Ended, expired and never-existed look the same.
      return new Response(null, { status: 404 });
    }
    throw error;
  }
}
