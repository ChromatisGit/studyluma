import { buildPagePaths } from "./configParser/buildPagePaths";
import { loadConfigs } from "./configParser/loadConfigs";
import { buildChapterContent } from "./dataTransformer/buildChapterContent";
import { generateCourseSQLScript } from "./dataTransformer/generateCourseSQLScript";
import { getTopicLabels, resolveCourses } from "./dataTransformer/resolveCourses";
import { cleanImageOutput, cleanPdfOutput, compilePdfToPublic, deleteGenerated } from "./io";

export async function runPipeline() {
    const skipPdf = process.env.NODE_ENV === "production";

    await deleteGenerated();
    await cleanImageOutput();
    if (!skipPdf) await cleanPdfOutput();
    const coursePlans = await loadConfigs()
    const pagePaths = buildPagePaths(coursePlans)
    const { pageSummaries, pdfConversionPaths } = await buildChapterContent(pagePaths)
    const topicLabels = await getTopicLabels(pagePaths)
    const courses = resolveCourses(coursePlans, pageSummaries, topicLabels)
    await generateCourseSQLScript("courses.sql", courses)
    if (!skipPdf) {
        await Promise.all(
            pdfConversionPaths.map(({ source, target, isSolution }) =>
                compilePdfToPublic(source, target, isSolution)
            )
        )
    } else {
        console.log("[builder] Skipping PDF compilation (NODE_ENV=production)")
    }
    console.log("[builder] SUCCESS")
}
