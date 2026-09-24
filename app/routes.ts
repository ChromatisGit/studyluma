import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("../src/milestone/routes/home.tsx"),
  route("login", "../src/milestone/routes/login.tsx"),
  route("logout", "../src/milestone/routes/logout.tsx"),
  route("courses/:courseId", "../src/milestone/routes/course.tsx"),
  route("courses/:courseId/topics/:topicId/chapters/:chapterId", "../src/milestone/routes/chapter.tsx"),
  route("w/:publicKey", "../src/milestone/routes/worksheet.tsx"),
  route("api/publish", "../src/milestone/routes/publish.ts"),
] satisfies RouteConfig;
