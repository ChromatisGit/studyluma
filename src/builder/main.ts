import { buildCoursesConfig } from "./transformer/courses";
import { getAllPagePaths } from "./transformer/pagePaths";
import { writeFile, readAllCourses, deleteGeneratedWebsite, readAllTopics } from "./io";
import { buildNavbarConfig } from "./transformer/navbar";
import { buildOverview } from "./transformer/overview";
import { buildSidebar } from "./transformer/sidebar";
import { processPageFile } from "./processPage";
import { setCourseLabels } from "./transformer/courseLabels";

async function main() {
  await deleteGeneratedWebsite()

  const coursesData = await readAllCourses();
  const topicsData = await readAllTopics();

  const courses = setCourseLabels(coursesData, topicsData)

  const filePaths = getAllPagePaths(courses);

  await Promise.all([

    ...filePaths.map(file => processPageFile(file)),

    ...courses.map(course => writeFile(buildSidebar(course))),
    ...courses.map(course => writeFile(buildOverview(course))),

    writeFile(buildCoursesConfig(courses)),
    writeFile(buildNavbarConfig(courses)),
  ])

  console.log(`[builder] OK - ${courses.length} course(s)`);
}

main().catch((err) => {
  console.error("[builder] FAILED\n", err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});