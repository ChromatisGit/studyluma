import type { DataArgs } from "@chromatis/base/data";
import { redirect } from "react-router";
import { chaptersInOrder, coursePath } from "../../src/modules/courses";
import { getCatalog } from "../../src/modules/catalog/server/catalog.server";
import { loadCatalog, loadCourses, loadSheets } from "../site.server";
import { actInSession } from "../../src/modules/classroom/server/classroom.server";
import { readViewer } from "../../src/modules/classroom";
import type { SummaryRule } from "../../src/modules/catalog";
import { action as planAction } from "./control.server";

const releaseIntents = [
  "releaseSummary",
  "lockSummary",
  "summaryRule",
  "releaseSolutions",
  "unlockSheet",
];

export async function action(args: DataArgs) {
  const { request, params } = args;
  if ((await readViewer(request)) !== "teacher") {
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
  if (form.get("intent") === "unlockSheet") {
    const sheetId = String(form.get("sheetId") ?? "");
    if (
      !bundle.worksheets.some(
        (item) => item.id === sheetId && item.chapterId === chapterId,
      )
    ) {
      throw new Response(null, { status: 400 });
    }
    const released = form.get("released") === "true";
    await actInSession(request, { type: "release.sheet", sheetId, released });
    return { released };
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

export async function loader({ params, request }: DataArgs) {
  const { courseId = "" } = params;
  const course = loadCourses(request).find((item) => item.id === courseId);
  if (!course) {
    throw new Response(null, { status: 404 });
  }
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  const viewer = await readViewer(request);
  const isStudentOverview = path === coursePath(courseId);
  if (viewer === "student" && !isStudentOverview) {
    throw redirect(coursePath(courseId));
  }
  // Everyone sees the current chapter's work; the teacher's panels also
  // show the chapter chosen under Inhalte (`?kapitel=`, which reloads this).
  const chapters = chaptersInOrder(course);
  const current = chapters.find((chapter) => chapter.current);
  const viewed =
    chapters.find(
      (chapter) =>
        chapter.id === new URL(request.url).searchParams.get("kapitel"),
    ) ??
    current ??
    chapters[0];
  // Students see only the current chapter's sheet cards: its outline, no
  // content. The teacher's panels read both chapters' content.
  const catalog = await loadCatalog(
    request,
    viewer === "teacher"
      ? [current, viewed].flatMap((chapter) => (chapter ? [chapter.id] : []))
      : [],
  );
  const currentSheets = current
    ? ((await loadSheets(request, courseId, current.id, "none")) ?? null)
    : null;
  return { course, viewer, catalog, currentSheets };
}
