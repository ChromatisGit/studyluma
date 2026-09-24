import { Form, redirect, useActionData, useSearchParams } from "react-router";
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

export default function Login() {
  const result = useActionData<typeof action>();
  const [search] = useSearchParams();
  return <main><h1>Anmelden</h1><div className="card"><Form method="post" action={`/login?from=${encodeURIComponent(safePath(search.get("from")))}`}><label><span>Benutzername</span><input name="username" autoComplete="username" required /></label><label><span>PIN</span><input name="pin" type="password" autoComplete="current-password" required /></label>{result?.error && <p className="error" role="alert">{result.error}</p>}<button type="submit">Anmelden</button></Form></div></main>;
}
