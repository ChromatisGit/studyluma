import { isViewerRole, type ViewerRole } from "../domain/viewer";
import { hasTeacherCookie, teacherPassword } from "./teacherLogin";

const COOKIE = "studyluma-viewer";

/** The stand-in role: a browser without the cookie is a teacher. */
function standInViewer(request: Request): ViewerRole {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === COOKIE && isViewerRole(value)) {
      return value;
    }
  }
  return "teacher";
}

/**
 * Who looks at the page. An instance with a `TEACHER_PASSWORD` makes only a
 * browser that logged in a teacher, everybody else is a student. Without one
 * (the Development and Demo instances) the stand-in cookie decides, and the
 * demo opens as a teacher.
 */
export async function readViewer(request: Request): Promise<ViewerRole> {
  const password = teacherPassword();
  if (password === undefined) {
    return standInViewer(request);
  }
  return (await hasTeacherCookie(request, password)) ? "teacher" : "student";
}

/** Set-Cookie value for the stand-in role of instances without a teacher password. */
export function viewerCookie(role: ViewerRole): string {
  return `${COOKIE}=${role}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax; HttpOnly`;
}
