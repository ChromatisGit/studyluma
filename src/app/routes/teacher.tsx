import {
  canManageCourses,
  getCourse,
  listTeacherWorksheets,
  setCurrentChapter,
  setWorksheetLocked,
} from "../../modules/courses";
import { listCourseChapters } from "../../modules/content";
import {
  getDatabase,
  notFound,
  requireSignedIn,
  type WebsiteLoadContext,
} from "../services";

type Args = {
  request: Request;
  params: { courseId?: string };
  context: WebsiteLoadContext;
};

async function teacherContext({ request, params, context }: Args) {
  const user = await requireSignedIn(request, context);
  const database = getDatabase(context);
  if (!(await canManageCourses(user, database))) {
    throw new Response("Forbidden", { status: 403 });
  }
  const courseId = params.courseId ?? notFound();
  const course = (await getCourse(user, courseId, database)) ?? notFound();
  return { user, database, course };
}

export async function loader(args: Args) {
  const { user, database, course } = await teacherContext(args);
  return {
    course,
    chapters: await listCourseChapters(user, course.id, database),
    worksheets: await listTeacherWorksheets(user, course.id, database),
  };
}

export async function action(args: Args) {
  const { user, database, course } = await teacherContext(args);
  const form = await args.request.formData();
  const chapterId = form.get("chapterId");
  const worksheetId = form.get("worksheetId");
  const locked = form.get("locked");
  let changed = false;
  if (typeof chapterId === "string" && chapterId.length && !worksheetId) {
    changed = await setCurrentChapter(user, course.id, chapterId, database);
  } else if (
    typeof worksheetId === "string" &&
    worksheetId.length &&
    !chapterId &&
    (locked === "true" || locked === "false")
  ) {
    changed = await setWorksheetLocked(
      user,
      course.id,
      worksheetId,
      locked === "true",
      database,
    );
  }
  if (!changed) {
    return new Response("Invalid teacher control", { status: 400 });
  }
  return Response.redirect(args.request.url, 303);
}

export { default } from "../../modules/courses/ui/teacher";
