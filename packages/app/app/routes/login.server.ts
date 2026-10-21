import type { DataArgs } from "@chromatis/base/data";
import { data, redirect } from "react-router";
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

/** Wrong passwords per client; a school behind one router can still log in. */
let limiter: FailureLimiter | undefined;

export async function loader({ request }: DataArgs) {
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

export async function action({ request }: DataArgs) {
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
