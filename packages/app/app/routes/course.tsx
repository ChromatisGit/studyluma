import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, useLocation } from "react-router";
import {
  CoursePage,
  chaptersInOrder,
  courseContentPath,
  coursePath,
  courseStructurePath,
} from "../../src/modules/courses";
import { getCatalog } from "../../src/modules/catalog/server/catalog.server";
import { loadCourses } from "../site.server";
import { actInSession } from "../../src/modules/classroom/server/classroom.server";
import {
  CurrentLesson,
  Inhalte,
  Unterricht,
  readViewer,
} from "../../src/modules/classroom";
import type { SummaryRule } from "../../src/modules/catalog";
import { action as planAction } from "./control";

const releaseIntents = [
  "releaseSummary",
  "lockSummary",
  "summaryRule",
  "releaseSolutions",
];

export async function action(args: ActionFunctionArgs) {
  const { request, params } = args;
  if (readViewer(request) !== "teacher") {
    throw new Response(null, { status: 403 });
  }
  const form = await request.clone().formData();
  // Everything else edits the course plan.
  if (!releaseIntents.includes(String(form.get("intent")))) {
    return planAction(args);
  }
  const chapterId = String(form.get("chapterId") ?? "");
  const bundle = getCatalog();
  const course = loadCourses(request).find(
    (item) => item.id === params.courseId,
  );
  if (
    !course ||
    !chaptersInOrder(course).some((chapter) => chapter.id === chapterId)
  ) {
    throw new Response(null, { status: 400 });
  }
  if (form.get("intent") === "releaseSummary") {
    await actInSession(request, {
      type: "release.summary",
      chapterId,
      released: true,
    });
    return { released: true };
  }
  if (form.get("intent") === "lockSummary") {
    await actInSession(request, {
      type: "release.summary",
      chapterId,
      released: false,
    });
    return { released: false };
  }
  if (form.get("intent") === "summaryRule") {
    const rule = String(form.get("rule"));
    if (!["kapitel", "abschluss", "manuell"].includes(rule)) {
      throw new Response(null, { status: 400 });
    }
    await actInSession(request, {
      type: "release.rule",
      chapterId,
      rule: rule as SummaryRule,
    });
    return { rule };
  }
  if (form.get("intent") === "releaseSolutions") {
    const sheetId = String(form.get("sheetId") ?? "");
    const sheet = bundle.worksheets.find(
      (item) => item.id === sheetId && item.chapterId === chapterId,
    );
    if (!sheet) {
      throw new Response(null, { status: 400 });
    }
    const released = form.get("released") === "true";
    const taskIds = sheet.sections.flatMap((section) =>
      section.items.flatMap((item) =>
        item.type === "task" &&
        item.task.items.some(
          (child) => child.type === "part" && child.part.markers.loesung,
        )
          ? [item.task.id]
          : [],
      ),
    );
    await actInSession(request, {
      type: "release.solutions",
      taskIds,
      released,
    });
    return { released };
  }
  throw new Response(null, { status: 400 });
}

export function loader({ params, request }: LoaderFunctionArgs) {
  const { courseId = "" } = params;
  const course = loadCourses(request).find((item) => item.id === courseId);
  if (!course) {
    throw new Response(null, { status: 404 });
  }
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  const viewer = readViewer(request);
  const isStudentOverview = path === coursePath(courseId);
  if (viewer === "student" && !isStudentOverview) {
    throw redirect(coursePath(courseId));
  }
  return { course, viewer };
}

export default function Course() {
  const { course, viewer } = useLoaderData<typeof loader>();
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, "");
  const activeTab =
    path === coursePath(course.id)
      ? "student"
      : path === courseStructurePath(course.id)
        ? "course-structure"
        : path === courseContentPath(course.id)
          ? "content"
          : "overview";
  return (
    <CoursePage
      course={course}
      teacher={viewer === "teacher"}
      currentLesson={<CurrentLesson course={course} />}
      teachingControls={<Unterricht course={course} />}
      structureControls={<Inhalte course={course} showHidden />}
      contents={<Inhalte course={course} showHidden />}
      activeTab={activeTab}
    />
  );
}
