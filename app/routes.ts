import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

const DEMO_MODE = process.env.DEMO_MODE === "true";

// Routes shared between normal and demo app layouts
const appRoutes = [
  route("practice", "../src/features/practice/routes/practice.tsx"),
  route("quiz", "../src/features/quiz/routes/quiz.tsx"),
  route("profile", "../src/features/profile/routes/profile.tsx"),
  route("admin", "../src/features/admin/routes/admin.tsx"),
  route("admin/:courseId", "../src/features/admin/routes/adminCourseDetail.tsx"),
  route(":group", "../src/core/routes/group.tsx"),
  route(":group/:course", "../src/core/routes/CourseLayout.tsx", [
    index("../src/features/course/routes/course.tsx"),
    route(":topic/:chapter/:worksheet", "../src/features/contentpage/routes/worksheet.tsx"),
    route(":topic/:chapter", "../src/features/course/routes/chapter.tsx"),
    route(":topic", "../src/features/course/routes/topic.tsx"),
  ]),
];

export default [
  route("access", "../src/features/access/routes/access.tsx"),
  route("admin/register", "../src/features/access/routes/adminRegister.tsx"),
  route("api/admin", "../src/features/admin/routes/api.tsx"),
  route("api/quiz", "../src/features/quiz/routes/api.tsx"),
  route("api/slides", "../src/features/slides/routes/api.tsx"),
  route("api/worksheet/:worksheetId/save", "../src/features/contentpage/routes/worksheet.api.ts", { id: "worksheet-api-save" }),
  route("api/worksheet/:worksheetId/checkpoint", "../src/features/contentpage/routes/worksheet.api.ts", { id: "worksheet-api-checkpoint" }),
  route("api/worksheet/:worksheetId/presence", "../src/features/contentpage/routes/worksheet.api.ts", { id: "worksheet-api-presence" }),
  route("slides", "../src/features/slides/routes/slides.tsx"),
  route("slides/:courseId/:topic/:chapter/:slideId", "../src/features/slides/routes/presenter.tsx"),
  route("slides/:courseId/:topic/:chapter/:slideId/projector", "../src/features/slides/routes/projector.tsx"),

  ...(DEMO_MODE ? [
    // Demo mode: standalone landing page at /, role-picker entry, then app inside DemoAppLayout
    index("../src/features/demo/routes/landingPage.tsx"),
    route("demo", "../src/features/demo/routes/demo.tsx"),
    route("roadmap", "../src/features/demo/routes/roadmap.tsx"),
    route("impressum", "../src/features/demo/routes/impressum.tsx"),
    layout("../src/features/demo/routes/DemoAppLayout.tsx", appRoutes),
  ] : [
    // Normal mode: app shell with standard home page
    layout("../src/core/routes/AppLayout.tsx", [
      index("../src/core/routes/home.tsx"),
      ...appRoutes,
    ]),
  ]),
] satisfies RouteConfig;
