import { createSessionService, getSessionCookie, buildSetSessionCookie } from "@chromatis/base/auth";
import { getUserById } from "@services/userService";

export const { getSession, buildSessionCookie, buildLogoutCookie } = createSessionService({
  getUserById,
  cookieName: "sn-session",
});

export function buildNewUserCodeCookie(code: string): string {
  return buildSetSessionCookie(code, { name: "sn-new-code", maxAge: 120, path: "/" });
}

export function buildClearNewUserCodeCookie(): string {
  return buildSetSessionCookie("", { name: "sn-new-code", maxAge: 0, path: "/" });
}

export function getNewUserCodeCookie(request: Request): string | null {
  return getSessionCookie(request, { name: "sn-new-code" });
}
