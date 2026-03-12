import "server-only";

import type { SlideDeck } from "@schema/slideTypes";
import type { LiveSlideState } from "@schema/streamTypes";
import { notFound } from "next/navigation";
import {
  getSlideDeck as getSlideDeckFromProvider,
  listSlideDecks as listFromProvider,
} from "@providers/slideProvider";
import { anonSQL } from "@db/runSQL";

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

// ---------------------------------------------------------------------------
// Live slide state (DB-backed, polled by projector / presenter)
// ---------------------------------------------------------------------------

export async function upsertSlideState(courseId: string, state: LiveSlideState): Promise<void> {
  await anonSQL`
    INSERT INTO slide_state (course_id, slide_index, blackout, macro_state)
    VALUES (${courseId}, ${state.slideIndex}, ${state.blackout}, ${state.macroState as never})
    ON CONFLICT (course_id) DO UPDATE
    SET slide_index = EXCLUDED.slide_index,
        blackout    = EXCLUDED.blackout,
        macro_state = EXCLUDED.macro_state,
        updated_at  = now()
  `;
}

export async function getSlideState(courseId: string): Promise<LiveSlideState> {
  const [row] = await anonSQL<{ slide_index: number; blackout: boolean; macro_state: Record<string, string> }[]>`
    SELECT slide_index, blackout, macro_state
    FROM slide_state
    WHERE course_id = ${courseId}
  `;
  return row
    ? { slideIndex: row.slide_index, blackout: row.blackout, macroState: row.macro_state }
    : { slideIndex: 0, blackout: false, macroState: {} };
}
