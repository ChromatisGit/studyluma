/**
 * Pipeline-specific types that are only used during content processing.
 * These types are not part of the runtime schema.
 */

/**
 * Represents raw text content before it is parsed into Markdown.
 * Used internally by the page parser to track unparsed content.
 */
export type RawText = {
  rawText: string;
};

/**
 * Collects unique course IDs from a chapters configuration object.
 * @param chapters - Record of chapter IDs to their configuration containing courseIds
 * @returns Array of unique course IDs
 */
export function collectCourseIds(chapters: Record<string, { courseIds: string[] }>): string[] {
  const ids = new Set<string>();
  for (const chapter of Object.values(chapters)) {
    for (const courseId of chapter.courseIds) {
      ids.add(courseId);
    }
  }
  return [...ids];
}
