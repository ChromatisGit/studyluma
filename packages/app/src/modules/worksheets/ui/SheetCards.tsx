import { useContext, useSyncExternalStore } from "react";
import { ActionCard, Badge, Card, CardBody } from "@chromatis/base/ui";
import {
  isUnlocked,
  openChallenges,
  sheetDone,
  sheetNumber,
  sheetStarted,
  type SheetsData,
  type Viewer,
} from "../domain/structure";
import { chapterStore } from "../infrastructure/localChapterStore";
import type { WorksheetLinks } from "./useWorksheetController";
import { TEXT } from "./texts";
import { SheetsPausedContext } from "./reporting";
import { fill } from "../../../helper/text";

/** Worksheets and the chapter's challenge pool in learning order. */
export function SheetCards({
  chapter,
  viewer,
  links,
  availableOnly = false,
}: {
  chapter: SheetsData;
  viewer: Viewer;
  links: WorksheetLinks;
  availableOnly?: boolean;
}) {
  const store = chapterStore(chapter.id);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const teacher = viewer === "teacher";
  const paused = useContext(SheetsPausedContext) && !teacher;
  const open = openChallenges(chapter, state).length;
  const challenges = (
    <CardBody>
      <strong className="card__title">{TEXT.cards.challenges}</strong>
      <span className="kapitel-blatt__status">
        <Badge status="info">
          {fill(TEXT.cards.availableOf, {
            open,
            total: chapter.challenges.length,
          })}
        </Badge>
      </span>
    </CardBody>
  );
  return (
    <div className="kapitel-blaetter" data-paused={paused || undefined}>
      {chapter.sheets
        .filter((sheet) => !availableOnly || isUnlocked(chapter, sheet, state))
        .map((sheet) => {
          const title = `${sheetNumber(chapter, sheet)}) ${sheet.title}`;
          const unlocked = isUnlocked(chapter, sheet, state);
          const badge = !unlocked ? (
            <Badge status="neutral">{TEXT.cards.locked}</Badge>
          ) : sheetDone(sheet, state) ? (
            <Badge status="success">{TEXT.cards.done}</Badge>
          ) : sheetStarted(sheet, state) ? (
            <Badge status="info">{TEXT.cards.started}</Badge>
          ) : !teacher && !state.seen[sheet.id] ? (
            <Badge status="info">{TEXT.cards.new}</Badge>
          ) : null;
          const body = (
            <CardBody>
              <strong className="card__title">{title}</strong>
              {badge && <span className="kapitel-blatt__status">{badge}</span>}
            </CardBody>
          );
          // Locked sheets are only a link for the teacher, who may open them;
          // outside the worksheet phase none is.
          return (!unlocked && !teacher) || paused ? (
            <Card key={sheet.id} surface="subtle">
              {body}
            </Card>
          ) : (
            <ActionCard
              key={sheet.id}
              to={links.sheet(sheet.slug)}
              {...(!unlocked ? { surface: "subtle" as const } : {})}
            >
              {body}
            </ActionCard>
          );
        })}
      {open > 0 &&
        (paused ? (
          <Card surface="subtle">{challenges}</Card>
        ) : (
          <ActionCard to={links.challenges}>{challenges}</ActionCard>
        ))}
    </div>
  );
}
