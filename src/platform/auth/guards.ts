import type { UserDTO, Session } from "./types.js";

export type { Session };

export function isAdmin(user: UserDTO): boolean {
  return user.role === "admin";
}

export function assertLoggedIn(session: Session | null): asserts session is Session {
  if (!session) throw new Response(null, { status: 302, headers: { Location: "/access" } });
}

export function assertAdminAccess(session: Session | null): asserts session is Session {
  if (!session || !isAdmin(session.user)) throw new Response("Not found", { status: 404 });
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
