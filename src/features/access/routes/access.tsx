import { redirect, useLoaderData } from "react-router";
import {
  buildClearNewUserCodeCookie,
  buildLogoutCookie,
  buildNewUserCodeCookie,
  buildSessionCookie,
  getAuthenticatedUser,
  getSession,
} from "@platform/index.server";
import { isAdmin } from "@platform/auth/guards";
import { getClientIp } from "@server-lib/getClientIp";
import {
  addCourseToUser,
  createUser,
  getUserById,
  type UserDTO,
} from "@services/userService";
import {
  getCourseDTO,
  getCourseId,
  getCoursesByAccess,
  getCourseSlug,
  isRegistrationOpen,
} from "@services/courseService";
import { getActiveQuizForUser } from "@services/quizService";
import AccessSection from "@features/access/AccessSection";
import { CoursePicker } from "@features/access/CoursePicker";

function getParam(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

function sanitizeFrom(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function bool(value: FormDataEntryValue | null): boolean {
  return value === "true";
}

function stringOrNull(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value : "";
  return text || null;
}

function fail(error: string, redirectTo?: string) {
  return { ok: false as const, error, ...(redirectTo ? { redirectTo } : {}) };
}

function hasCourseAccess(user: UserDTO, groupKey: string, courseId: string): boolean {
  if (isAdmin(user)) return true;
  if (user.role !== "user") return false;
  return user.groupKey === groupKey && user.courseIds.includes(courseId);
}

async function ensureCourseAccess(
  user: UserDTO,
  groupKey: string,
  courseId: string,
  ip: string,
): Promise<UserDTO | null> {
  if (hasCourseAccess(user, groupKey, courseId)) return user;
  if (isAdmin(user) || user.role !== "user" || user.groupKey !== groupKey) return null;
  await addCourseToUser(user, courseId, ip);
  return getUserById(user.id);
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const groupKey = getParam(url, "groupKey");
  const subjectKey = getParam(url, "subjectKey");
  const from = sanitizeFrom(getParam(url, "from"));
  const isCourseJoin = Boolean(groupKey && subjectKey);
  const isCoursePicker = getParam(url, "join") === "1";
  const session = await getSession(request);

  if (session?.user) {
    if (isCourseJoin && groupKey && subjectKey) {
      const courseId = await getCourseId(groupKey, subjectKey);
      if (await isRegistrationOpen(courseId)) {
        await addCourseToUser(session.user, courseId, getClientIp(request));
      }
      const course = await getCourseDTO(courseId);
      throw redirect(course.slug);
    }
    if (isCoursePicker) {
      const accessGroups = await getCoursesByAccess(session.user);
      const ids = [...accessGroups.accessible, ...accessGroups.restricted].filter(
        (id) => !session.user.courseIds.includes(id),
      );
      const courses = await Promise.all(ids.map((id) => getCourseDTO(id)));
      return { mode: "picker" as const, courses };
    }
    throw redirect("/");
  }

  if (isCoursePicker) {
    const accessGroups = await getCoursesByAccess(null);
    const courses = await Promise.all(accessGroups.restricted.map((id) => getCourseDTO(id)));
    return { mode: "picker" as const, courses };
  }

  let courseId: string | null = null;
  let courseName = "this course";
  let courseRoute: string | null = null;
  let registrationOpen = false;

  if (isCourseJoin && groupKey && subjectKey) {
    courseId = await getCourseId(groupKey, subjectKey);
    const course = await getCourseDTO(courseId);
    courseName = course.label;
    courseRoute = course.slug;
    registrationOpen = await isRegistrationOpen(courseId);
  }

  return {
    mode: "form" as const,
    showRegister: isCourseJoin,
    isCourseJoin,
    groupKey,
    courseId,
    courseRoute,
    courseName,
    isRegistrationOpen: registrationOpen,
    currentUserAccessCode: null,
    from,
  };
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "logout") {
    throw redirect("/access", { headers: { "Set-Cookie": buildLogoutCookie() } });
  }

  if (intent === "clear-new-user-code") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        "content-type": "application/json",
        "Set-Cookie": buildClearNewUserCodeCookie(),
      },
    });
  }

  const accessCode = stringOrNull(formData.get("accessCode")) ?? "";
  const pin = stringOrNull(formData.get("pin")) ?? "";
  const ctx = {
    isCourseJoin: bool(formData.get("isCourseJoin")),
    groupKey: stringOrNull(formData.get("groupKey")),
    courseId: stringOrNull(formData.get("courseId")),
    courseRoute: stringOrNull(formData.get("courseRoute")),
    isRegistrationOpen: bool(formData.get("isRegistrationOpen")),
    from: sanitizeFrom(stringOrNull(formData.get("from"))),
  };

  const hasCode = accessCode.trim().length > 0;
  const hasPin = pin.trim().length > 0;
  if (!hasCode && !hasPin) return fail("Please enter your credentials.");

  const courseCtx =
    ctx.isCourseJoin && ctx.groupKey && ctx.courseId && ctx.courseRoute
      ? { groupKey: ctx.groupKey, courseId: ctx.courseId, courseRoute: ctx.courseRoute }
      : null;
  if (ctx.isCourseJoin && !courseCtx) return fail("Invalid course link.");

  const ip = getClientIp(request);
  const mode: "normal" | "course-auth" | "course-pin" =
    !ctx.isCourseJoin ? "normal" : hasCode ? "course-auth" : "course-pin";

  let user: UserDTO | null = null;
  let redirectTo = "/";
  const headers = new Headers();

  if (mode === "normal") {
    if (!hasCode || !hasPin) return fail("Invalid credentials.");
    user = await getAuthenticatedUser(accessCode, pin, ip);
    if (!user) return fail("Invalid credentials.");
    const [activeQuiz, primaryCourseSlug] = await Promise.all([
      getActiveQuizForUser(user),
      user.courseIds.length > 0 ? getCourseSlug(user.courseIds[0]!) : Promise.resolve(null),
    ]);
    redirectTo = activeQuiz ? "/quiz" : ctx.from ?? primaryCourseSlug ?? "/";
    headers.append("Set-Cookie", buildSessionCookie(user.id));
  } else {
    const { groupKey, courseId, courseRoute } = courseCtx!;
    const registrationOpen = await isRegistrationOpen(courseId);
    const session = await getSession(request);
    const currentUser = session?.user ?? null;

    if (currentUser && hasCourseAccess(currentUser, groupKey, courseId)) {
      user = currentUser;
      redirectTo = ctx.from ?? courseRoute;
      headers.append("Set-Cookie", buildSessionCookie(user.id));
    } else if (mode === "course-auth") {
      if (!hasPin) return fail("Invalid credentials.");
      const authenticated = await getAuthenticatedUser(accessCode, pin, ip);
      if (!authenticated) return fail("Invalid credentials.");
      if (!registrationOpen && !hasCourseAccess(authenticated, groupKey, courseId)) {
        return fail("Registration window not open.", "/");
      }
      user = await ensureCourseAccess(authenticated, groupKey, courseId, ip);
      if (!user) return fail("Failed to enroll in course.", "/");
      redirectTo = ctx.from ?? courseRoute;
      headers.append("Set-Cookie", buildSessionCookie(user.id));
    } else {
      if (!registrationOpen) return fail("Registration window not open.", "/");
      const created = await createUser(pin, groupKey, ip);
      user = await ensureCourseAccess(created.user, groupKey, courseId, ip);
      if (!user) return fail("Failed to enroll in course.", "/");
      redirectTo = ctx.from ?? courseRoute;
      headers.append("Set-Cookie", buildSessionCookie(user.id));
      headers.append("Set-Cookie", buildNewUserCodeCookie(created.accessCode));
    }
  }

  throw redirect(redirectTo, { headers });
}

export default function Access() {
  const data = useLoaderData<typeof loader>();
  if (data.mode === "picker") return <CoursePicker courses={data.courses} />;
  return <AccessSection {...data} />;
}
