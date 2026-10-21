import type { PublicCatalog, Task } from "../../catalog";
import { walkInlines } from "../../content-renderer";
import { outlineSheet, outlineTask, type SheetsShown } from "./outline";
import type { MerkkarteCard, SheetsData } from "./structure";

/** The Merkkarten the tips of these tasks point to. */
function tipCardIds(tasks: readonly Task[]): Set<string> {
  const ids = new Set<string>();
  for (const task of tasks) {
    for (const item of task.items) {
      if (item.type === "part") {
        walkInlines(item.part.markers.tipp ?? [], (inline) => {
          if (inline.type === "merkkarteRef") {
            ids.add(inline.targetId);
          }
        });
      }
    }
  }
  return ids;
}

/**
 * A chapter's worksheets and challenges for one reader. The catalog already
 * holds them in the compiled shape, so nothing is translated here: this only
 * picks the chapter's objects, in order, and attaches where its tip cards live.
 * What the page does not show goes as an outline (see `SheetsShown`), with
 * only the tip cards of what it shows.
 */
export function sheetsData(
  catalog: PublicCatalog,
  chapterId: string,
  context: {
    /** "9.2", from the course the chapter is read in. */
    number: string;
    viewer: SheetsData["viewer"];
    releasedSolutions: string[];
    sessionSheets: SheetsData["sessionSheets"];
    /** Where a chapter's Inhalt can be read, for Merkkarte links. */
    describeChapter: (chapterId: string) => { origin: string; href: string };
  },
  shown: SheetsShown = "all",
): SheetsData | undefined {
  const chapter = catalog.chapters.find((c) => c.id === chapterId);
  if (!chapter) {
    return undefined;
  }
  const allSheets = chapter.worksheetIds.flatMap((id) => {
    const sheet = catalog.worksheets.find((w) => w.id === id);
    return sheet ? [sheet] : [];
  });
  const allChallenges =
    catalog.challengePools.find((p) => p.id === chapter.challengePoolId)
      ?.challenges ?? [];
  const full = (sheetId: string) =>
    shown === "all" || (typeof shown === "object" && shown.sheetId === sheetId);
  const sheets = allSheets.map((sheet) =>
    full(sheet.id) ? sheet : outlineSheet(sheet),
  );
  const challenges =
    shown === "all" || shown === "challenges"
      ? allChallenges
      : allChallenges.map(outlineTask);
  const shownTasks = [
    ...allSheets
      .filter((sheet) => full(sheet.id))
      .flatMap((sheet) =>
        sheet.sections.flatMap((section) =>
          section.items.flatMap((item) =>
            item.type === "task" ? [item.task] : [],
          ),
        ),
      ),
    ...(challenges === allChallenges ? allChallenges : []),
  ];
  const tipped = tipCardIds(shownTasks);
  const cards: Record<string, MerkkarteCard> = {};
  for (const [id, card] of Object.entries(catalog.tipCards)) {
    if (!tipped.has(id)) {
      continue;
    }
    const { origin, href } = context.describeChapter(card.chapterId);
    cards[id] = { ...card, origin, href: `${href}#${card.anchor}` };
  }
  return {
    id: chapter.id,
    number: context.number,
    title: chapter.title,
    buildId: catalog.buildId,
    viewer: context.viewer,
    sheets,
    challenges,
    releasedSolutions: context.releasedSolutions,
    sessionSheets: context.sessionSheets,
    cards,
  };
}
