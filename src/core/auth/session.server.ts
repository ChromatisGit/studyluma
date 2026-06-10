import { createSessionService, getSessionCookie, buildSetSessionCookie } from "@chromatis/base/auth";
import { getUserById } from "@services/userService";

export const { getSession, buildSessionCookie, buildLogoutCookie } = createSessionService({
  getUserById,
  cookieName: "sn-session",
});

export function buildNewUserUsernameCookie(username: string): string {
  return buildSetSessionCookie(username, { name: "sn-new-username", maxAge: 120, path: "/" });
}

export function buildClearNewUserUsernameCookie(): string {
  return buildSetSessionCookie("", { name: "sn-new-username", maxAge: 0, path: "/" });
}

export function getNewUserUsernameCookie(request: Request): string | null {
  return getSessionCookie(request, { name: "sn-new-username" });
}
