"use server";

import { getSession } from "@services/authService";
import {
  syncWorksheetResponses,
  loadWorksheetData,
  saveCheckpointResponseService,
  updatePresenceService,
} from "@services/worksheetService";
import type { CheckpointResponse } from "@schema/checkpointTypes";
import type { WorksheetData } from "@services/worksheetService";

export type WorksheetActionResult = { ok: true } | { ok: false; error: string };
export type WorksheetLoadResult =
  | { ok: true; data: WorksheetData }
  | { ok: false; error: string };

/**
 * Batch-save all dirty task responses accumulated since the last flush.
 * Called by SyncManager after debounce or on section navigation / tab hide / reconnect.
 */
export async function syncWorksheetAction(
  worksheetId: string,
  responses: Record<string, string>,
): Promise<WorksheetActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  try {
    await syncWorksheetResponses(worksheetId, responses, session.user);
    return { ok: true };
  } catch (error) {
    console.error("[Worksheet] Failed to sync responses:", error);
    return { ok: false, error: "Failed to sync responses" };
  }
}

export async function loadWorksheetDataAction(
  worksheetId: string,
): Promise<WorksheetLoadResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  try {
    const data = await loadWorksheetData(worksheetId, session.user);
    return { ok: true, data };
  } catch (error) {
    console.error("[Worksheet] Failed to load worksheet data:", error);
    return { ok: false, error: "Failed to load data" };
  }
}

/**
 * Update the current section index for presence tracking.
 * Fire-and-forget — no return value needed.
 */
export async function updatePresenceAction(
  courseId: string,
  worksheetId: string,
  sectionIndex: number,
): Promise<void> {
  const session = await getSession();
  if (!session) return;
  try {
    await updatePresenceService(session.user, courseId, worksheetId, sectionIndex);
  } catch (error) {
    console.error("[Worksheet] Failed to update presence:", error);
  }
}

/**
 * Save a checkpoint response immediately (not batched — deliberate user action).
 * Stores the full understanding + causes for admin monitoring.
 */
export async function saveCheckpointAction(
  worksheetId: string,
  sectionIndex: number,
  response: CheckpointResponse,
): Promise<WorksheetActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  try {
    await saveCheckpointResponseService(worksheetId, sectionIndex, response, session.user);
    return { ok: true };
  } catch (error) {
    console.error("[Worksheet] Failed to save checkpoint:", error);
    return { ok: false, error: "Failed to save checkpoint" };
  }
}
