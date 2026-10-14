import { Page, PageHeader } from "@chromatis/base/ui";
import { Link } from "react-router";
import TEXT from "../app.de.json";

/** Temporary destination until account sign-in is connected. */
export default function Login() {
  return (
    <Page title={TEXT.login.title} width="content">
      <PageHeader title={TEXT.login.title} />
      <p>{TEXT.login.unavailable}</p>
      <Link className="link" to="/courses">
        {TEXT.login.toCourses}
      </Link>
    </Page>
  );
}
