import { redirect } from "react-router";
import { isViewerRole } from "../domain/viewer";
import { viewerCookie } from "./viewerCookie";

/**
 * Form action behind the view switch: stores the chosen role and returns
 * to the page the switch was used on (same-origin paths only).
 */
export async function switchViewer(request: Request): Promise<Response> {
  const form = await request.formData();
  const role = form.get("role");
  const back = form.get("redirectTo");
  if (!isViewerRole(role)) {
    throw new Response("Unknown role", { status: 400 });
  }
  const target =
    typeof back === "string" && back.startsWith("/") && !back.startsWith("//")
      ? back
      : "/";
  return redirect(target, { headers: { "Set-Cookie": viewerCookie(role) } });
}
