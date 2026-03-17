"use server";

import { getSession, isAdmin } from "@services/authService";
import { listSlideDecks, upsertSlideState } from "@services/slideService";
import { publishToChannel } from "@server-lib/ablyServer";
import type { SlideStateEvent } from "@schema/streamTypes";
import { z } from "zod/v4";

const SlideStateSchema = z.object({
  slideIndex: z.number().int().min(0),
  blackout: z.boolean(),
  macroState: z.record(z.string(), z.string()),
  revealStep: z.number().int().min(0),
});

/**
 * Persists the current slide state to DB and publishes a SLIDE_STATE event
 * to the Ably admin channel so the projector updates in realtime.
 */
export async function broadcastSlideStateAction(
  courseId: string,
  rawState: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) {
    return { ok: false, error: "Unauthorized" };
  }

  const parsed = SlideStateSchema.safeParse(rawState);
  if (!parsed.success) {
    return { ok: false, error: "Invalid state" };
  }

  await upsertSlideState(courseId, parsed.data);

  const event: SlideStateEvent = { type: "SLIDE_STATE", ...parsed.data };
  await publishToChannel(`classroom:${courseId}:admin`, event);

  return { ok: true };
}

export async function listSlideDecksAction(
  subject: string,
  topicId: string,
  chapterId: string,
): Promise<{ ok: true; slideIds: string[] } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) {
    return { ok: false, error: "Unauthorized" };
  }

  const slideIds = await listSlideDecks({ subject, topicId, chapterId });
  return { ok: true, slideIds };
}
