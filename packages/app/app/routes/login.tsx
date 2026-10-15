import { Alert, Button, Input, Page, PageHeader } from "@chromatis/base/ui";
import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import {
  classroom,
  classroomEnabled,
  clearClassroomCookie,
  clearTeacherCookie,
  clientKey,
  readClassroomAuth,
  createFailureLimiter,
  passwordMatches,
  readViewer,
  teacherCookie,
  teacherPassword,
  type FailureLimiter,
} from "../../src/modules/classroom/server/classroom.server";
import TEXT from "../app.de.json";

/** Wrong passwords per client; a school behind one router can still log in. */
let limiter: FailureLimiter | undefined;

export async function loader({ request }: LoaderFunctionArgs) {
  const configured = teacherPassword() !== undefined;
  return {
    configured,
    teacher: configured && (await readViewer(request)) === "teacher",
  };
}

/** Signing out ends the unit this browser leads; students are disconnected. */
async function endUnitOf(request: Request) {
  const auth = classroomEnabled() ? readClassroomAuth(request) : null;
  if (!auth) {
    return;
  }
  try {
    await classroom().act(auth, { type: "end" });
  } catch {
    // Already ended, expired, or the cookie belongs to a student: nothing to end.
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  if (form.get("intent") === "logout") {
    await endUnitOf(request);
    return redirect("/login", {
      headers: [
        ["Set-Cookie", clearTeacherCookie(request)],
        ["Set-Cookie", clearClassroomCookie(request)],
      ],
    });
  }
  const password = teacherPassword();
  if (password === undefined) {
    throw new Response(null, { status: 404 });
  }
  limiter ??= createFailureLimiter({ maxFailures: 10, windowMs: 15 * 60_000 });
  const client = clientKey(request);
  if (!limiter.allowed(client)) {
    return data({ error: "tooMany" as const }, { status: 429 });
  }
  if (!(await passwordMatches(password, String(form.get("password") ?? "")))) {
    limiter.fail(client);
    return data({ error: "invalid" as const }, { status: 401 });
  }
  return redirect("/courses", {
    headers: { "Set-Cookie": await teacherCookie(request, password) },
  });
}

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
