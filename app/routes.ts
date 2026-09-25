import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("../src/app/routes/home.tsx"),
  route("login", "../src/app/routes/login.tsx"),
  route("logout", "../src/app/routes/logout.tsx"),
  route("courses/:courseId", "../src/app/routes/course.tsx"),
  route(
    "courses/:courseId/topics/:topicId/chapters/:chapterId",
    "../src/app/routes/chapter.tsx",
  ),
  route("w/:publicKey", "../src/app/routes/worksheet.tsx"),
  route("api/publish", "../src/app/routes/publish.ts"),
] satisfies RouteConfig;
