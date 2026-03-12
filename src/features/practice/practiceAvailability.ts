/**
 * Practice Node Availability
 *
 * Controls whether Practice Nodes are shown in the UI.
 *
 * PRACTICE_DEV_OVERRIDE:
 *   - true  → always show practice UI (for testing without a backend pool)
 *   - false → always hide practice UI (start of year, no pools yet)
 *   - null  → use real backend check (production)
 */
export const PRACTICE_DEV_OVERRIDE: boolean | null = false;

/**
 * Check if a practice pool exists for a given topic.
 * Returns true if the student should see practice options for this topic.
 *
 * Currently returns the dev override. When the Practice Node backend is
 * ready, replace the body with a real DB/API check:
 *   - topic must have ≥40 tasks in its pool
 *   - topic must not be deactivated for this class
 */
export async function isPracticeAvailable(
  _courseId: string,
  _topicId: string,
): Promise<boolean> {
  if (PRACTICE_DEV_OVERRIDE !== null) return PRACTICE_DEV_OVERRIDE;
  // TODO: replace with real backend check when Practice Node is implemented
  // return checkTopicPracticePool(courseId, topicId);
  return false;
}
