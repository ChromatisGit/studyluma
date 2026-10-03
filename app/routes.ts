import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

const chapter = "courses/:courseId/chapters/:chapterId";

export default [
  index("routes/index.ts"),
  layout("routes/shell.tsx", [
    route("courses", "routes/home.tsx"),
    route("courses/:courseId", "routes/course.tsx"),
    route(chapter, "routes/chapter.tsx"),
    route(`${chapter}/sheets/:sheetId`, "routes/sheet.tsx"),
    route(`${chapter}/challenges`, "routes/challenges.tsx"),
  ]),
  route(`${chapter}/lesson`, "routes/lesson.tsx"),
  route(`${chapter}/lesson/projector`, "routes/projector.tsx"),
  route("viewer", "routes/viewer.ts"),
] satisfies RouteConfig;
