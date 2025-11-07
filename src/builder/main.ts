import { buildCoursesList } from "./courses";
import { readAllCourses, writeConfig } from "./io";
import { buildNavbar } from "./navbar";


async function main() {
  const courses = await readAllCourses();

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