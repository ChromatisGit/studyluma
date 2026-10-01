import { redirect } from "react-router";
import { loginUser } from "@chromatis/base/auth";
import {
  getDatabase,
  getSessionManager,
  hasSessionCookie,
  type WebsiteLoadContext,
} from "../services";

function safePath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function loader({
  request,
  context,
}: {
  request: Request;
  context: WebsiteLoadContext;
}) {
  if (
    hasSessionCookie(request, context) &&
    (await getSessionManager(context).resolve(request))
  ) {
    throw redirect("/");
  }
  return null;
}

export async function action({
  request,
  context,
  url,
}: {
  request: Request;
  context: WebsiteLoadContext;
  url: URL;
}) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const pin = String(form.get("pin") ?? "");
  if (!username || !pin) {
    return { error: "Benutzername und PIN sind erforderlich." };
  }
  const result = await loginUser(getDatabase(context).anonSQL, username, pin);
  if (result.status !== "ok") {
    return { error: "Anmeldung fehlgeschlagen." };
  }
  const { cookie } = await getSessionManager(context).create(result.user);
  const from = safePath(url.searchParams.get("from"));
  throw redirect(from, { headers: { "Set-Cookie": cookie } });
}

export { default } from "../views/login";
