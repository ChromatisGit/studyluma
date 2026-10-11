/**
 * The app's React Router root and package-level routes: the single source of
 * truth, written into the Chromatis manifest by generate-manifest.ts. Instances
 * and the package's own tooling never repeat this list.
 *
 * Files are package-exported specifiers (`@studyluma/app/app/routes/home`,
 * the `exports` of package.json), so the packed package carries exactly what
 * it exports and Chromatis' generated route files import them by name. The classroom module declares its own routes (join form,
 * join code, session endpoint, session probe) in its `module.ts`, so an
 * instance that disables the module has none of them.
 */
import type { RouteDeclaration } from "@chromatis/base/module";

const chapter = "courses/:courseId/chapters/:chapterId";
const file = (name: string) =>
  `@studyluma/app/app/routes/${name.replace(/\.tsx?$/, "")}`;

export const root = "@studyluma/app/app/root";

export const routes: readonly RouteDeclaration[] = [
  { index: true, file: file("index.ts") },
  {
    layout: true,
    file: file("shell.tsx"),
    children: [
      { path: "login", file: file("login.tsx") },
      { path: "courses", file: file("home.tsx") },
      { path: "courses/:courseId", file: file("course.tsx") },
      {
        path: "courses/:courseId/overview",
        file: file("course.tsx"),
        id: "course-overview",
      },
      {
        path: "courses/:courseId/course-structure",
        file: file("course.tsx"),
        id: "course-structure",
      },
      {
        path: "courses/:courseId/content",
        file: file("course.tsx"),
        id: "course-content",
      },
      { path: chapter, file: file("chapter.tsx") },
      { path: `${chapter}/sheets/:sheetId`, file: file("sheet.tsx") },
      { path: `${chapter}/challenges`, file: file("challenges.tsx") },
      { path: "courses/:courseId/quiz", file: file("quiz.tsx") },
    ],
  },
  { path: `${chapter}/lesson`, file: file("lesson.tsx") },
  { path: `${chapter}/lesson/projector`, file: file("projector.tsx") },
  { path: "content/assets/:assetId", file: file("asset.ts") },
  { path: "api/check", file: file("check.ts") },
];
