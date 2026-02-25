import "server-only";

import type { SlideDeck } from "@schema/slideTypes";
import { notFound } from "next/navigation";
import {
  getSlideDeck as getSlideDeckFromProvider,
  listSlideDecks as listFromProvider,
} from "@providers/slideProvider";
import { anonSQL } from "@db/runSQL";

// ---------------------------------------------------------------------------
// Slide session (cross-device projector state)
// ---------------------------------------------------------------------------

type SlideSessionRow = {
  state: unknown;
  updated_at: string;
  last_heartbeat: string;
};

export async function getSlideSession(
  channel: string,
): Promise<SlideSessionRow | null> {
  const [row] = await anonSQL<SlideSessionRow[]>`
    SELECT state, updated_at, last_heartbeat
    FROM slide_sessions
    WHERE channel_name = ${channel}
  `;
  return row ?? null;
}

export async function upsertSlideSession(
  channelName: string,
  state: object,
): Promise<void> {
  await anonSQL`
    INSERT INTO slide_sessions (channel_name, state, updated_at, last_heartbeat)
      VALUES (${channelName}, ${state as never}, now(), now())
    ON CONFLICT (channel_name) DO UPDATE
      SET state          = EXCLUDED.state,
          updated_at     = now(),
          last_heartbeat = now()
  `;
}

export async function heartbeatSlideSession(channelName: string): Promise<void> {
  await anonSQL`UPDATE slide_sessions SET last_heartbeat = now() WHERE channel_name = ${channelName}`;
}

// ---------------------------------------------------------------------------
// Slide decks (content)
// ---------------------------------------------------------------------------

type GetSlideDeckArgs = {
  subject: string;
  topicId: string;
  chapterId: string;
  slideId: string;
};

export async function getSlideDeck(args: GetSlideDeckArgs): Promise<SlideDeck> {
  const deck = await getSlideDeckFromProvider(args);
  if (!deck) notFound();
  return deck;
}

export async function listSlideDecks(
  args: Omit<GetSlideDeckArgs, "slideId">
): Promise<string[]> {
  return listFromProvider(args);
}
