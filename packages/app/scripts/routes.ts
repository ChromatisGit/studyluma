/**
 * The app's root, document and package-level routes: the single source of
 * truth, written into the Chromatis manifest by generate-manifest.ts. Instances
 * and the package's own tooling never repeat this list.
 *
 * Files are package-exported specifiers (`@studyluma/app/app/routes/home`,
 * the `exports` of package.json), so the packed package carries exactly what
 * it exports and Chromatis' generated entries import them by name. A page's
 * `server` file holds its loader and action; the page file runs in the
 * browser. Routes with `api: true` are server endpoints. The classroom module declares its own routes (join form,
 * join code, session endpoint, session probe) in its `module.ts`, so an
 * instance that disables the module has none of them.
 */
import type { RouteDeclaration } from "@chromatis/base/module";
import TEXT from "../app/app.de.json";

const chapter = "courses/:courseId/chapters/:chapterSlug";
const file = (name: string) =>
  `@studyluma/app/app/routes/${name.replace(/\.tsx?$/, "")}`;
/** A page with its server file (`<name>.server.ts`). */
const page = (path: string, name: string, id?: string): RouteDeclaration => ({
  path,
  file: file(name),
  server: file(name.replace(/\.tsx$/, ".server.ts")),
  ...(id ? { id } : {}),
});

export const root = "@studyluma/app/app/root";
export const server = "@studyluma/app/app/root.server";

/** Favicon, `_headers`, `robots.txt` and the share image, relative to the manifest. */
export const publicDirectory = "../public";

export const document = {
  lang: "de",
  title: TEXT.brand,
  description: TEXT.description,
  attributes: { "data-brand": "studyluma" },
  icon: "/favicon.svg",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  colorModeKey: "studyluma:color-mode",
};

export const routes: readonly RouteDeclaration[] = [
  { index: true, file: file("index.tsx") },
  {
    layout: true,
    file: file("shell.tsx"),
    server: file("shell.server.ts"),
    children: [
      page("login", "login.tsx"),
      page("courses", "home.tsx"),
      page("courses/:courseId", "course.tsx"),
      page("courses/:courseId/overview", "course.tsx", "course-overview"),
      page(
        "courses/:courseId/course-structure",
        "course.tsx",
        "course-structure",
      ),
      page("courses/:courseId/content", "course.tsx", "course-content"),
      page(chapter, "chapter.tsx"),
      page(`${chapter}/sheets/:sheetSlug`, "sheet.tsx"),
      page(`${chapter}/challenges`, "challenges.tsx"),
      page("courses/:courseId/quiz", "quiz.tsx"),
    ],
  },
  page(`${chapter}/lesson`, "lesson.tsx"),
  page(`${chapter}/lesson/projector`, "projector.tsx"),
  page(`${chapter}/lesson/sheets/:sheetSlug`, "lessonSheet.tsx"),
  { path: "content/assets/:assetId", api: true, file: file("asset.ts") },
  { path: "api/check", api: true, file: file("check.ts") },
];
