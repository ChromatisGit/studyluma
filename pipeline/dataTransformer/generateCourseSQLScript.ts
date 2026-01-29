import { Course } from "@schema/course";
import { writeSQLFile } from "@pipeline/io";

export async function generateCourseSQLScript(path: string, courses: Course[]): Promise<void> {
    const values = courses.map((c) => {
        const currentTopic = c.topics[0].topicId
        const currentChapter = c.topics[0].chapters[0].chapterId
        return `('${c.id}', '${currentTopic}', '${currentChapter}', NULL)`
    }).join(",\n");;


    const sql = [
        "INSERT INTO courses (course_id, current_topic_id, current_chapter_id, registration_open_until)",
        "VALUES",
        values,
        "ON CONFLICT (course_id) DO NOTHING;",
        "",
    ].join("\n");

    await writeSQLFile(path, sql);
}
