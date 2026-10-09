import { normalizeJoinCode } from "../domain/joinCode";
import type { ClassroomAuth } from "../application/classroomService";

/**
 * The browser's credential for its Classroom Session: the join code it
 * belongs to and the opaque token the session handed out. HttpOnly, so
 * scripts on the page can never read the token.
 */
const COOKIE = "studyluma-classroom";
const TOKEN = /^[\w-]{32,128}$/;

export function readClassroomAuth(request: Request): ClassroomAuth | null {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name !== COOKIE || !value) {
      continue;
    }
    const [rawCode = "", token = ""] = value.split(".");
    const code = normalizeJoinCode(rawCode);
    if (code && TOKEN.test(token)) {
      return { code, token };
    }
  }
  return null;
}

function secure(request: Request): string {
  const https =
    new URL(request.url).protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  return https ? "; Secure" : "";
}

/** Lives as long as a session can (twelve hours). */
export function classroomCookie(request: Request, auth: ClassroomAuth): string {
  return `${COOKIE}=${auth.code}.${auth.token}; Path=/; Max-Age=43200; SameSite=Lax; HttpOnly${secure(request)}`;
}

export function clearClassroomCookie(request: Request): string {
  return `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${secure(request)}`;
}

/** Who is asking, for the join-code rate limit. Set by the server entry. */
export function clientKey(request: Request): string {
  return (
    request.headers.get("x-chromatis-client") ??
    request.headers.get("cf-connecting-ip") ??
    "local"
  );
}
