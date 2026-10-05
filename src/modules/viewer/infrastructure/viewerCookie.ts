import { isViewerRole, type ViewerRole } from "../domain/viewer";

const COOKIE = "studyluma-viewer";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** The stubbed role from the request cookie; students by default. */
export function readViewer(request: Request): ViewerRole {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === COOKIE && isViewerRole(value)) {
      return value;
    }
  }
  return "student";
}

/** Set-Cookie header value that stores the role. */
export function viewerCookie(role: ViewerRole): string {
  return `${COOKIE}=${role}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
}
