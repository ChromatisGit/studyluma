import { Form, useActionData, useSearchParams } from "react-router";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Input,
  Page,
  PageHeader,
} from "@chromatis/base/ui";
function safePath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function Login() {
  const result = useActionData<{ error?: string }>();
  const [search] = useSearchParams();
  return (
    <Page title="Anmelden" className="auth-page">
      <PageHeader title="Anmelden" />
      <Card className="auth-card" surface="accent" border="default">
        <CardBody>
          <Form
            className="stack stack-600"
            method="post"
            action={`/login?from=${encodeURIComponent(safePath(search.get("from")))}`}
          >
            <Input
              label="Benutzername"
              name="username"
              autoComplete="username"
              required
            />
            <Input
              label="PIN"
              name="pin"
              type="password"
              autoComplete="current-password"
              required
            />
            {result?.error && <Alert status="error">{result.error}</Alert>}
            <Button type="submit">Anmelden</Button>
          </Form>
        </CardBody>
      </Card>
    </Page>
  );
}
