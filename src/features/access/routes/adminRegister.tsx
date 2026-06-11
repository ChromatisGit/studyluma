import { redirect } from "react-router";
import { RegisterForm } from "@chromatis/base";
import { registerUser } from "@chromatis/base/auth";
import { anonSQL } from "@core/db.server.js";
import { buildSessionCookie, getSession } from "@core/auth/session.server.js";
export function meta() {
  return [{ title: "Admin Registration — StudyLuma" }];
}

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  if (session) throw redirect("/");
  return null;
}

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const pin = String(form.get("pin") ?? "");
  const confirmPin = String(form.get("confirmPin") ?? "");

  if (pin !== confirmPin) {
    return { status: "pin_mismatch" as const };
  }

  const result = await registerUser(anonSQL, { username, pin, role: "admin" });

  if (result.status === "registered") {
    throw redirect("/", {
      headers: { "Set-Cookie": buildSessionCookie(result.user.id) },
    });
  }

  return { status: result.status };
}

export default function AdminRegisterPage({ actionData }: { actionData?: { status: string } | null }) {
  return (
    <RegisterForm
      {...(actionData ? { status: actionData.status } : {})}
      title="Admin Registration"
      submitLabel="Create admin account"
    />
  );
}
