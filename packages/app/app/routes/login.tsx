import { Alert, Button, Input, Page, PageHeader } from "@chromatis/base/ui";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import type { action, loader } from "./login.server";
import TEXT from "../app.de.json";

/** The teacher signs in with the instance's one password; students never need to. */
export default function Login() {
  const { configured, teacher } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <Page title={TEXT.login.title} width="content">
      <PageHeader title={TEXT.login.title} />
      {!configured ? (
        <>
          <p>{TEXT.login.unavailable}</p>
          <Link className="link" to="/courses">
            {TEXT.login.toCourses}
          </Link>
        </>
      ) : teacher ? (
        <Form method="post">
          <p>{TEXT.login.signedIn}</p>
          <input type="hidden" name="intent" value="logout" />
          <Button type="submit">{TEXT.login.logout}</Button>
        </Form>
      ) : (
        <>
          <p>{TEXT.login.intro}</p>
          <Form method="post" className="teacher-login">
            <Input
              label={TEXT.login.password}
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            {result && <Alert status="error">{TEXT.login[result.error]}</Alert>}
            <Button type="submit">{TEXT.login.submit}</Button>
          </Form>
        </>
      )}
    </Page>
  );
}
