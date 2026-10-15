/**
 * Who looks at a page. A teacher login decides it where an instance has a
 * `TEACHER_PASSWORD`; otherwise it is a stub that the demo's view switch sets.
 * Everything else reads it from `readViewer`.
 */
export type ViewerRole = "student" | "teacher";

export const viewerRoles: readonly ViewerRole[] = ["student", "teacher"];

export function isViewerRole(value: unknown): value is ViewerRole {
  return value === "student" || value === "teacher";
}
