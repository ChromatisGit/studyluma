import { Form, redirect, useActionData } from "react-router";
import { buildSessionCookie } from "@core/auth/session.server";
import { Button } from "@components/Button";
import { getDemoUser, type DemoRole } from "@features/demo/demoSession.server";
import styles from "./demo.module.css";

export function meta() {
  return [
    { title: "Demo — StudyLuma" },
    { name: "robots", content: "noindex,follow" },
  ];
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
    <main className={styles.page}>
      <h1 className={styles.title}>StudyLuma Demo</h1>
      <p className={styles.copy}>Wähle eine Perspektive, um die Demo zu starten.</p>
      {actionData?.error && (
        <p className={styles.error}>{actionData.error}</p>
      )}
      <Form method="post" className={styles.actions}>
        <Button type="submit" name="role" value="student" variant="primary" size="lg">
          Als Schüler fortfahren
        </Button>
        <Button type="submit" name="role" value="teacher" variant="secondary" size="lg">
          Als Lehrer fortfahren
        </Button>
      </Form>
    </main>
  );
}
