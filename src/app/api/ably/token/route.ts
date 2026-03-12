/**
 * GET /api/ably/token?courseId=...
 *
 * Issues a short-lived Ably token for the requesting user.
 *
 * Admin (courseId required): subscribe capability on classroom:{courseId}:admin
 * Student (no courseId): subscribe capability on classroom:{id}:student for each enrolled course.
 *
 * Response: { tokenRequest: AblyTokenRequest; courseIds: string[] }
 */

import { getSession, isAdmin } from "@services/authService";
import { getAblyRest } from "@server-lib/ablyServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const user = session.user;
  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId");

  let capability: Record<string, string[]>;
  let courseIds: string[];

  if (isAdmin(user)) {
    if (!courseId) return new Response("Missing courseId", { status: 400 });
    capability = { [`classroom:${courseId}:admin`]: ["subscribe"] };
    courseIds = [courseId];
  } else {
    courseIds = user.courseIds;
    capability = Object.fromEntries(
      courseIds.map((id) => [`classroom:${id}:student`, ["subscribe"]]),
    );
  }

  const tokenRequest = await getAblyRest().auth.createTokenRequest({
    clientId: user.id,
    capability: capability as never,
  });

  return Response.json({ tokenRequest, courseIds });
}
