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
    route("login", "routes/login.tsx"),
    route("courses", "routes/home.tsx"),
    route("courses/:courseId", "routes/course.tsx"),
    route("courses/:courseId/overview", "routes/course.tsx", {
      id: "course-overview",
    }),
    route("courses/:courseId/course-structure", "routes/course.tsx", {
      id: "course-structure",
    }),
    route("courses/:courseId/content", "routes/course.tsx", {
      id: "course-content",
    }),
    route(chapter, "routes/chapter.tsx"),
    route(`${chapter}/sheets/:sheetId`, "routes/sheet.tsx"),
    route(`${chapter}/challenges`, "routes/challenges.tsx"),
    route("courses/:courseId/quiz", "routes/quiz.tsx"),
  ]),
  route(`${chapter}/lesson`, "routes/lesson.tsx"),
  route(`${chapter}/lesson/projector`, "routes/projector.tsx"),
  route("live", "routes/live.tsx"),
] satisfies RouteConfig;
