import { Form, useActionData, useSearchParams } from "react-router";
function safePath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function Login() {
  const result = useActionData<{ error?: string }>();
  const [search] = useSearchParams();
  return (
    <main>
      <h1>Anmelden</h1>
      <div className="card">
        <Form
          method="post"
          action={`/login?from=${encodeURIComponent(safePath(search.get("from")))}`}
        >
          <label>
            <span>Benutzername</span>
            <input name="username" autoComplete="username" required />
          </label>
          <label>
            <span>PIN</span>
            <input
              name="pin"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {result?.error && (
            <p className="error" role="alert">
              {result.error}
            </p>
          )}
          <button type="submit">Anmelden</button>
        </Form>
      </div>
    </main>
  );
}
