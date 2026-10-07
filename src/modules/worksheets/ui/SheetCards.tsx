import { useSyncExternalStore } from "react";
import { Badge, Card, CardBody, CardLink } from "@chromatis/base/ui";
import type { ViewerRole } from "../../viewer";
import type { Chapter } from "../domain/contract";
import {
  isUnlocked,
  openChallenges,
  sheetDone,
  sheetStarted,
} from "../domain/structure";
import { chapterStore } from "../infrastructure/localChapterStore";
import type { WorksheetLinks } from "./useWorksheetController";
import { TEXT } from "./texts";

/** Worksheets and the chapter's challenge pool in learning order. */
export function SheetCards({
  chapter,
  viewer,
  links,
  availableOnly = false,
}: {
  chapter: Chapter;
  viewer: ViewerRole;
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
  const open = openChallenges(chapter, state).length;
  return (
    <div className="kapitel-blaetter">
      {chapter.sheets
        .filter((sheet) => !availableOnly || isUnlocked(sheet, state))
        .map((sheet) => {
          const title = `${sheet.number}) ${sheet.title}`;
          const unlocked = isUnlocked(sheet, state);
          const badge = !unlocked ? (
            <Badge status="neutral">{TEXT.cards.locked}</Badge>
          ) : sheetDone(sheet, state) ? (
            <Badge status="success">{TEXT.cards.done}</Badge>
          ) : sheetStarted(sheet, state) ? (
            <Badge status="info">{TEXT.cards.started}</Badge>
          ) : !teacher && !state.seen[sheet.id] ? (
            <Badge status="info">{TEXT.cards.new}</Badge>
          ) : null;
          return (
            <Card
              key={sheet.id}
              kind={unlocked ? "action" : "content"}
              {...(!unlocked ? { surface: "subtle" as const } : {})}
            >
              <CardBody>
                {!unlocked && !teacher ? (
                  <strong className="card__title">{title}</strong>
                ) : (
                  <CardLink className="card__title" to={links.sheet(sheet.id)}>
                    {title}
                  </CardLink>
                )}
                {badge && (
                  <span className="kapitel-blatt__status">{badge}</span>
                )}
              </CardBody>
            </Card>
          );
        })}
      {open > 0 && (
        <Card kind="action">
          <CardBody>
            <CardLink className="card__title" to={links.challenges}>
              Challenges
            </CardLink>
            <span className="kapitel-blatt__status">
              <Badge status="info">
                {open} von {chapter.challenges.length} verfügbar
              </Badge>
            </span>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
