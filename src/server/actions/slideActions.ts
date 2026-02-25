"use server";

import { getSession, isAdmin } from "@services/authService";
import { upsertSlideSession, heartbeatSlideSession, listSlideDecks } from "@services/slideService";
import { z } from "zod/v4";

const CHANNEL_RE = /^[a-z0-9-]{1,64}$/;

// pointer excluded — laser pointer is same-device only via BroadcastChannel
// interactiveState: Record<string,string> mirrors current SlideState type
const SlideStateSchema = z.object({
  slideIndex: z.number().int().min(0),
  blackout: z.boolean(),
  interactiveState: z.record(z.string(), z.string()),
});

export async function updateSlideStateAction(
  channelName: string,
  rawState: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) {
    return { ok: false, error: "Unauthorized" };
  }

  if (!CHANNEL_RE.test(channelName)) {
    return { ok: false, error: "Invalid channel name" };
  }

  const parsed = SlideStateSchema.safeParse(rawState);
  if (!parsed.success) {
    return { ok: false, error: "Invalid state" };
  }

  await upsertSlideSession(channelName, parsed.data);

  return { ok: true };
}

export async function heartbeatSlideSessionAction(channelName: string): Promise<void> {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) return;
  if (!CHANNEL_RE.test(channelName)) return;

  await heartbeatSlideSession(channelName);
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
