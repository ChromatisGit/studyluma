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
