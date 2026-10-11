import type { PublicCatalog } from "../../catalog";
import type { MerkkarteCard, SheetsData } from "./structure";

/**
 * A chapter's worksheets and challenges for one reader. The catalog already
 * holds them in the compiled shape, so nothing is translated here: this only
 * picks the chapter's objects, in order, and attaches where its tip cards live.
 */
export function sheetsData(
  catalog: PublicCatalog,
  chapterId: string,
  context: {
    /** "9.2", from the course the chapter is read in. */
    number: string;
    viewer: SheetsData["viewer"];
    releasedSolutions: string[];
    /** Where a chapter's Inhalt can be read, for Merkkarte links. */
    describeChapter: (chapterId: string) => { origin: string; href: string };
  },
): SheetsData | undefined {
  const chapter = catalog.chapters.find((c) => c.id === chapterId);
  if (!chapter) {
    return undefined;
  }
  const cards: Record<string, MerkkarteCard> = {};
  for (const [id, card] of Object.entries(catalog.tipCards)) {
    const { origin, href } = context.describeChapter(card.chapterId);
    cards[id] = { ...card, origin, href: `${href}#${card.anchor}` };
  }
  return {
    id: chapter.id,
    number: context.number,
    title: chapter.title,
    buildId: catalog.buildId,
    viewer: context.viewer,
    sheets: chapter.worksheetIds.flatMap((id) => {
      const sheet = catalog.worksheets.find((w) => w.id === id);
      return sheet ? [sheet] : [];
    }),
    challenges:
      catalog.challengePools.find((p) => p.id === chapter.challengePoolId)
        ?.challenges ?? [],
    releasedSolutions: context.releasedSolutions,
    cards,
  };
}
