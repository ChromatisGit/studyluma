import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { courseOverviewPath } from "../../src/modules/courses";
import {
  coursePlanCookie,
  readCoursePlan,
  updateCoursePlan,
} from "../../src/modules/courses/infrastructure/coursePlan";
import { getCourse } from "../../src/modules/courses/infrastructure/courseRepository";
import { readViewer } from "../../src/modules/viewer";

export function loader({ params }: LoaderFunctionArgs) {
  const courseId = params.courseId ?? "";
  const base = getCourse(courseId);
  if (!base) {
    throw new Response(null, { status: 404 });
  }
  return redirect(courseOverviewPath(courseId));
}

export async function action({ params, request }: ActionFunctionArgs) {
  if (readViewer(request) !== "teacher") {
    throw new Response(null, { status: 403 });
  }
  const courseId = params.courseId ?? "";
  const base = getCourse(courseId);
  if (!base) {
    throw new Response(null, { status: 404 });
  }
  const form = await request.formData();
  const plan = updateCoursePlan(base, readCoursePlan(request, courseId), form);
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
