import { isAdmin, assertLoggedIn as _assertLoggedIn, assertAdminAccess } from "@chromatis/base/auth";
import type { UserDTO, Session } from "./types.js";

export type { Session };
export { isAdmin, assertAdminAccess };

export function assertLoggedIn(session: Session | null): asserts session is Session {
  _assertLoggedIn(session, "/access");
}

function canUserAccessPage(
  user: UserDTO | null,
  groupKey: string,
  courseIsPublic: boolean,
  courseId?: string,
): boolean {
  if (courseIsPublic) return true;
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (user.groupKey !== groupKey) return false;
  if (courseId && !user.courseIds.includes(courseId)) return false;
  return true;
}

export function assertCanAccessPage(
  session: Session | null,
  groupKey: string,
  courseIsPublic: boolean,
  courseId?: string,
): void {
  if (courseIsPublic) return;
  assertLoggedIn(session);
  if (!canUserAccessPage(session.user, groupKey, courseIsPublic, courseId)) {
    throw new Response("Not found", { status: 404 });
  }
}
