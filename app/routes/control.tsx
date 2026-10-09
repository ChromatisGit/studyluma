import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getCatalog } from "../../src/modules/catalog/server/catalog.server";
import {
  chaptersInOrder,
  courseOverviewPath,
  summariesToRelease,
} from "../../src/modules/courses";
import {
  applyCoursePlan,
  coursePlanCookie,
  readCoursePlan,
  updateCoursePlan,
} from "../../src/modules/courses/infrastructure/coursePlan";
import { loadCourses } from "../site.server";
import { readViewer } from "../../src/modules/classroom";
import {
  actInSession,
  currentReleases,
} from "../../src/modules/classroom/server/classroom.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const courseId = params.courseId ?? "";
  const base = loadCourses(request).find((item) => item.id === courseId);
  if (!base) {
    throw new Response(null, { status: 404 });
  }
  return redirect(courseOverviewPath(courseId));
}

/** Moving the class forward opens the Inhalte whose rule says so. */
async function openSummaries(
  request: Request,
  from: ReturnType<typeof applyCoursePlan>,
  to: ReturnType<typeof applyCoursePlan>,
) {
  const { view, snapshot } = await currentReleases(request);
  if (!snapshot) {
    // Without a running classroom there is nobody to release anything to.
    return;
  }
  const withSummary = new Set(
    getCatalog().summaries.map((summary) => summary.chapterId),
  );
  for (const id of summariesToRelease({
    order: chaptersInOrder(to).map((chapter) => chapter.id),
    from: from.currentChapterId,
    to: to.currentChapterId,
    rule: (chapterId) => view.rules[chapterId] ?? "manuell",
    closed: (chapterId) =>
      withSummary.has(chapterId) && !view.summaries.includes(chapterId),
  })) {
    await actInSession(request, {
      type: "release.summary",
      chapterId: id,
      released: true,
    });
  }
}

export async function action({ params, request }: ActionFunctionArgs) {
  if (readViewer(request) !== "teacher") {
    throw new Response(null, { status: 403 });
  }
  const courseId = params.courseId ?? "";
  const base = loadCourses(request).find((item) => item.id === courseId);
  if (!base) {
    throw new Response(null, { status: 404 });
  }
  const form = await request.formData();
  const before = readCoursePlan(request, courseId);
  const plan = updateCoursePlan(base, before, form);
  if (form.get("intent") === "current") {
    await openSummaries(
      request,
      applyCoursePlan(base, before),
      applyCoursePlan(base, plan),
    );
  }
  const cookie = coursePlanCookie(request, plan);
  if (cookie.length > 4000) {
    throw new Response("Der Lernweg ist für den lokalen Speicher zu groß.", {
      status: 413,
    });
  }
  return Response.json({ ok: true }, { headers: { "Set-Cookie": cookie } });
}

export default function ControlRoute() {
  return null;
}
