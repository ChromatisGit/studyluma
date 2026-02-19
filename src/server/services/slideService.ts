import "server-only";

import type { SlideDeck } from "@schema/slideTypes";
import { notFound } from "next/navigation";
import {
  getSlideDeck as getSlideDeckFromProvider,
  listSlideDecks as listFromProvider,
} from "@providers/slideProvider";

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
