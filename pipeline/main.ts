import { buildPagePaths } from "./configParser/buildPagePaths";
import { loadConfigs } from "./configParser/loadConfigs";
import { buildChapterContent } from "./dataTransformer/buildChapterContent";
import { generateCourseSQLScript } from "./dataTransformer/generateCourseSQLScript";
import { getTopicLabels, resolveCourses } from "./dataTransformer/resolveCourses";
import { cleanImageOutput, deleteGenerated } from "./io";

export async function runPipeline() {
    await deleteGenerated();
    await cleanImageOutput();
    const coursePlans = await loadConfigs()
    const pagePaths = buildPagePaths(coursePlans)
    const { pageSummaries } = await buildChapterContent(pagePaths)
    const topicLabels = await getTopicLabels(pagePaths)
    const courses = resolveCourses(coursePlans, pageSummaries, topicLabels)
    await generateCourseSQLScript("courses.sql", courses)
    console.log("[builder] SUCCESS")
}
