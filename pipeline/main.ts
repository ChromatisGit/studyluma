import { buildPagePaths } from "./configParser/buildPagePaths";
import { loadConfigs } from "./configParser/loadConfigs";
import { buildChapterContent } from "./dataTransformer/buildChapterContent";
import { getTopicLabels, resolveCourses } from "./dataTransformer/resolveCourses";
import { deleteGenerated, writeJSONFile } from "./io";

async function main() {
    await deleteGenerated();
    const coursePlans = await loadConfigs()
    const pagePaths = buildPagePaths(coursePlans)
    const { pageSummaries } = await buildChapterContent(pagePaths)
    const topicLabels = await getTopicLabels(pagePaths)
    const courses = resolveCourses(coursePlans, pageSummaries, topicLabels)
    writeJSONFile("config/courses.json", courses)
    console.log("[builder] SUCCESS")
}

try {
    await main();
} catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[builder] FAILED\n",message);
    process.exitCode = 1;
}
