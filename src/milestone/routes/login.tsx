import { redirect } from "react-router";
import { loginUser } from "@chromatis/base/auth";
import { getDatabase, getSessionManager } from "../server";

function safePath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function loader({ request }: { request: Request }) {
  if (await getSessionManager().resolve(request)) throw redirect("/");
  return null;
}

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const pin = String(form.get("pin") ?? "");
  if (!username || !pin) return { error: "Benutzername und PIN sind erforderlich." };
  const result = await loginUser(getDatabase().anonSQL, username, pin);
  if (result.status !== "ok") return { error: "Anmeldung fehlgeschlagen." };
  const { cookie } = await getSessionManager().create(result.user);
  const from = safePath(new URL(request.url).searchParams.get("from"));
  throw redirect(from, { headers: { "Set-Cookie": cookie } });
}

export { default } from "../views/login";
