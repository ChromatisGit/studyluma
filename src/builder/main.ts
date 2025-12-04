import { deleteGeneratedWebsite, writeGeneratedFile } from "./io";
import { loadContent } from "./loadContent";
import { buildCoursesConfig } from "./transformer/courses";
import { getAllPagePaths } from "./transformer/pagePaths";
import { buildPageFile } from "./transformer/pages";
import { buildNavbarConfig } from "./transformer/navbar";
import { buildOverview } from "./transformer/overview";
import { buildSidebar } from "./transformer/sidebar";
import { buildGroupsAndSubjects } from "./transformer/groupsAndSubjects";
import { validateCourses } from "./validateCourses";
import { prepareCourses } from "./prepareCourses";
import { getAllWorksheets } from "./loadWorksheets";
import { buildWorksheet } from "@worksheet/buildWorksheet";

async function main() {
  await deleteGeneratedWebsite()

  const { groupsAndSubjects, topics, courses } = await loadContent();

  validateCourses(courses, groupsAndSubjects);

  const resolvedCourses = prepareCourses(courses, groupsAndSubjects, topics);

  const worksheetLocations  = await getAllWorksheets(resolvedCourses);

  await Promise.all([
    writeGeneratedFile(buildGroupsAndSubjects(groupsAndSubjects)),

    ...getAllPagePaths(resolvedCourses).map(async file => writeGeneratedFile(await buildPageFile(file))),

    ...worksheetLocations.map(async file => buildWorksheet(file)),

    ...resolvedCourses.map(course => writeGeneratedFile(buildSidebar(course))),
    ...resolvedCourses.map(course => writeGeneratedFile(buildOverview(course, resolvedCourses))),

    writeGeneratedFile(buildCoursesConfig(resolvedCourses)),
    writeGeneratedFile(buildNavbarConfig(resolvedCourses)),
  ])

  console.log(`[builder] OK - ${resolvedCourses.length} course(s)`);
}

main().catch((err) => {
  console.error("[builder] FAILED\n", err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});

