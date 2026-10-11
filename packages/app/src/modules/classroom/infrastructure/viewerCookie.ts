import { isViewerRole, type ViewerRole } from "../domain/viewer";

const COOKIE = "studyluma-viewer";

/** The demo opens as a teacher. An existing student cookie can still preview learner pages. */
export function readViewer(request: Request): ViewerRole {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === COOKIE && isViewerRole(value)) {
      return value;
    }
  }
  return "teacher";
}

/** Set-Cookie value for the stand-in role until accounts exist. */
export function viewerCookie(role: ViewerRole): string {
  return `${COOKIE}=${role}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax; HttpOnly`;
}
