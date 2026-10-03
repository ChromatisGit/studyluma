/**
 * Who looks at a page. Until accounts exist, the role is a stub that the
 * demo's view switch sets; everything else reads it from here.
 */
export type ViewerRole = "student" | "teacher";

export const viewerRoles: readonly ViewerRole[] = ["student", "teacher"];

export function isViewerRole(value: unknown): value is ViewerRole {
  return value === "student" || value === "teacher";
}
