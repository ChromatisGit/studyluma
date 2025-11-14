import { buildCoursesList } from "./transformer/courses";
import { buildCourseFileMappings } from "./transformer/fileMapping";
import { buildPage, copyFile, readAllCourses, writeConfig } from "./io";
import { buildNavbar } from "./transformer/navbar";
import { buildOverview } from "./transformer/overview";

async function main() {
  const courses = await readAllCourses();

  const filesPaths = buildCourseFileMappings(courses);
  await Promise.all(
    filesPaths.map(({ source, target }) => copyFile(source, target))
  );

  courses.map(course => buildPage(buildOverview(course)));

  writeConfig('courses', buildCoursesList(courses));
  writeConfig('navbar', buildNavbar(courses));

  console.log(
    `[builder] OK - ${courses.length} course(s)`
  );
}

main().catch((err) => {
  console.error("[builder] FAILED\n", err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});