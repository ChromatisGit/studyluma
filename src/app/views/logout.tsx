import { Form } from "react-router";
import { Button, Page, PageHeader } from "@chromatis/base/ui";

export default function Logout() {
  return (
    <Page title="Abmelden" className="auth-page">
      <PageHeader title="Abmelden" />
      <Form method="post">
        <Button type="submit">Abmelden</Button>
      </Form>
    </Page>
  );
}
