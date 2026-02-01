import { buildPagePaths } from "./configParser/buildPagePaths";
import { loadConfigs } from "./configParser/loadConfigs";
import { buildChapterContent } from "./dataTransformer/buildChapterContent";
import { generateCourseSQLScript } from "./dataTransformer/generateCourseSQLScript";
import { getTopicLabels, resolveCourses } from "./dataTransformer/resolveCourses";
import { cleanImageOutput, deleteGenerated, writeJSONFile } from "./io";
import { ensureDevAdminUser } from "./devAdminUser";

export async function runPipeline() {
    await deleteGenerated();
    await cleanImageOutput();
    const coursePlans = await loadConfigs()
    const pagePaths = buildPagePaths(coursePlans)
    const { pageSummaries } = await buildChapterContent(pagePaths)
    const topicLabels = await getTopicLabels(pagePaths)
    const courses = resolveCourses(coursePlans, pageSummaries, topicLabels)
    await writeJSONFile("config/courses.json", courses)
    await generateCourseSQLScript("courses.sql", courses)
    await ensureDevAdminUser();
    console.log("[builder] SUCCESS")
}
