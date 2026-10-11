import { Page, PageHeader } from "@chromatis/base/ui";
import { Link } from "react-router";

/** Temporary destination until account sign-in is connected. */
export default function Login() {
  return (
    <Page title="Login" width="content">
      <PageHeader title="Login" />
      <p>Die Anmeldung ist derzeit noch nicht verfügbar.</p>
      <Link className="link" to="/courses">
        Zu den Kursen
      </Link>
    </Page>
  );
}
