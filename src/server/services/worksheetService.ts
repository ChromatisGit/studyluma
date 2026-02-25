import "server-only";

import { userSQL } from "@db/runSQL";
import type { CheckpointResponse, UnderstandingLevel, DifficultyCause } from "@schema/checkpointTypes";
import type { UserDTO } from "@services/userService";

export type WorksheetData = {
  taskResponses: Record<string, string>;
  /** Section indices where the user has already submitted a checkpoint. */
  submittedSections: number[];
};

/**
 * Save a single task response to the DB.
 */
export async function saveTaskResponseService(
  worksheetId: string,
  taskKey: string,
  value: string,
  user: UserDTO,
): Promise<void> {
  await userSQL(user)`
    INSERT INTO task_responses (user_id, worksheet_id, task_key, value, updated_at)
    VALUES (${user.id}, ${worksheetId}, ${taskKey}, ${value}, NOW())
    ON CONFLICT (user_id, worksheet_id, task_key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

/**
 * Batch-save multiple task responses in a single query using UNNEST.
 * One DB round trip regardless of how many keys are dirty.
 * Called by syncWorksheetAction after debounce flush.
 */
export async function syncWorksheetResponses(
  worksheetId: string,
  responses: Record<string, string>,
  user: UserDTO,
): Promise<void> {
  const entries = Object.entries(responses);
  if (entries.length === 0) return;

  const taskKeys = entries.map(([key]) => key);
  const values = entries.map(([, value]) => value);

  await userSQL(user)`
    INSERT INTO task_responses (user_id, worksheet_id, task_key, value, updated_at)
    SELECT ${user.id}, ${worksheetId}, unnest(${taskKeys}::text[]), unnest(${values}::text[]), NOW()
    ON CONFLICT (user_id, worksheet_id, task_key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

/**
 * Load task responses and submitted checkpoint section indices for a worksheet.
 */
export async function loadWorksheetData(
  worksheetId: string,
  user: UserDTO,
): Promise<WorksheetData> {
  const run = userSQL(user);
  const [taskRows, checkpointRows] = await Promise.all([
    run<{ task_key: string; value: string }[]>`
      SELECT task_key, value
      FROM task_responses
      WHERE user_id = ${user.id} AND worksheet_id = ${worksheetId}
    `,
    run<{ section_index: number }[]>`
      SELECT section_index
      FROM checkpoint_responses
      WHERE user_id = ${user.id} AND worksheet_id = ${worksheetId}
    `,
  ]);

  const taskResponses = Object.fromEntries(taskRows.map((r) => [r.task_key, r.value]));
  const submittedSections = checkpointRows.map((r) => r.section_index);

  return { taskResponses, submittedSections };
}

/**
 * Upsert the current worksheet section for a user.
 * Called fire-and-forget from WorksheetNavigator on section change.
 */
export async function updatePresenceService(
  user: UserDTO,
  courseId: string,
  worksheetId: string,
  sectionIndex: number,
): Promise<void> {
  await userSQL(user)`
    INSERT INTO worksheet_presence (user_id, course_id, worksheet_id, section_index, updated_at)
    VALUES (${user.id}, ${courseId}, ${worksheetId}, ${sectionIndex}, NOW())
    ON CONFLICT (user_id, course_id, worksheet_id)
    DO UPDATE SET section_index = EXCLUDED.section_index, updated_at = NOW()
  `;
}

// ==========================================================================
// Admin monitoring
// ==========================================================================

export type PresenceStat = { sectionIndex: number; count: number };

export type CheckpointStats = {
  total: number;
  green: number;
  yellow: number;
  red: number;
  causes: Partial<Record<DifficultyCause, number>>;
};

export type WorksheetMonitorData = {
  presence: PresenceStat[];
  checkpoints: CheckpointStats | null;
};

/**
 * Returns presence distribution (last 90 min) and checkpoint stats for a worksheet.
 * Admin only — called via getWorksheetMonitorAction.
 */
export async function getWorksheetMonitorService(
  user: UserDTO,
  courseId: string,
  worksheetId: string,
): Promise<WorksheetMonitorData> {
  const run = userSQL(user);

  const [presenceRows, checkpointRows] = await Promise.all([
    run<{ section_index: number; count: number }[]>`
      SELECT section_index, COUNT(*)::int AS count
      FROM worksheet_presence
      WHERE course_id = ${courseId}
        AND worksheet_id = ${worksheetId}
        AND updated_at > NOW() - INTERVAL '90 minutes'
      GROUP BY section_index
      ORDER BY section_index
    `,
    run<{
      understanding_level: UnderstandingLevel;
      difficulty_causes: DifficultyCause[] | null;
      count: number;
    }[]>`
      SELECT understanding_level, difficulty_causes, COUNT(*)::int AS count
      FROM checkpoint_responses
      WHERE worksheet_id = ${worksheetId}
      GROUP BY understanding_level, difficulty_causes
    `,
  ]);

  const presence: PresenceStat[] = presenceRows.map((r) => ({
    sectionIndex: r.section_index,
    count: r.count,
  }));

  if (checkpointRows.length === 0) {
    return { presence, checkpoints: null };
  }

  let green = 0;
  let yellow = 0;
  let red = 0;
  const causes: Partial<Record<DifficultyCause, number>> = {};

  for (const row of checkpointRows) {
    const n = row.count;
    if (row.understanding_level === 'green') green += n;
    else if (row.understanding_level === 'yellow') yellow += n;
    else if (row.understanding_level === 'red') red += n;

    if (row.difficulty_causes) {
      for (const cause of row.difficulty_causes) {
        causes[cause] = (causes[cause] ?? 0) + n;
      }
    }
  }

  return {
    presence,
    checkpoints: { total: green + yellow + red, green, yellow, red, causes },
  };
}

/**
 * Save a checkpoint response to the DB (full data for admin monitoring).
 */
export async function saveCheckpointResponseService(
  worksheetId: string,
  sectionIndex: number,
  response: CheckpointResponse,
  user: UserDTO,
): Promise<void> {
  const causes = response.causes ?? null;
  await userSQL(user)`
    INSERT INTO checkpoint_responses
      (user_id, worksheet_id, section_index, understanding_level, difficulty_causes, submitted_at)
    VALUES (
      ${user.id},
      ${worksheetId},
      ${sectionIndex},
      ${response.understanding as UnderstandingLevel},
      ${causes as DifficultyCause[] | null},
      to_timestamp(${response.submittedAt} / 1000.0)
    )
    ON CONFLICT (user_id, worksheet_id, section_index)
    DO UPDATE SET
      understanding_level = EXCLUDED.understanding_level,
      difficulty_causes   = EXCLUDED.difficulty_causes,
      submitted_at        = EXCLUDED.submitted_at
  `;
}
