import { Form, redirect, useActionData } from "react-router";
import { buildSessionCookie } from "@core/index.server";
import { getDemoUser, type DemoRole } from "@features/demo/demoSession.server";

export function meta() {
  return [{ title: "Demo — StudyLuma" }];
}

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const role = form.get("role") as DemoRole | null;

  if (role !== "student" && role !== "teacher") {
    return { error: "Ungültige Rolle." };
  }

  const user = await getDemoUser(role);
  if (!user) {
    return { error: "Demo-Nutzer nicht gefunden. Bitte Demo-Daten einspielen." };
  }

  const dest = role === "teacher" ? "/admin" : "/demo/math";
  return redirect(dest, {
    headers: { "Set-Cookie": buildSessionCookie(user.id) },
  });
}

export default function DemoEntryPage() {
  const actionData = useActionData<typeof action>();
  return (
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>StudyLuma Demo</h1>
      <p style={{ color: "var(--muted-foreground)" }}>Wähle eine Perspektive, um die Demo zu starten.</p>
      {actionData?.error && (
        <p style={{ color: "red" }}>{actionData.error}</p>
      )}
      <Form method="post" style={{ display: "flex", gap: "1rem" }}>
        <button type="submit" name="role" value="student">
          Als Schüler fortfahren
        </button>
        <button type="submit" name="role" value="teacher">
          Als Lehrer fortfahren
        </button>
      </Form>
    </main>
  );
}
