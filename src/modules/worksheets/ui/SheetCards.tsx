import { useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { Badge, Card, CardBody, CardLink } from "@chromatis/base/ui";
import { fill } from "../../../helper/text";
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

/** The chapter page's worksheet list: "1) Titel" with its state. */
export function SheetCards({
  chapter,
  viewer,
  links,
}: {
  chapter: Chapter;
  viewer: ViewerRole;
  links: WorksheetLinks;
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
      {chapter.sheets.map((sheet) => {
        const title = `${sheet.number}) ${sheet.title}`;
        const unlocked = isUnlocked(sheet, state);
        if (!unlocked && !teacher) {
          return (
            <Card key={sheet.id} surface="subtle" border="default">
              <CardBody>
                <span className="card__title">{title}</span>
                <span className="kapitel-blatt__status">
                  <Badge status="warning">{TEXT.cards.locked}</Badge>
                </span>
              </CardBody>
            </Card>
          );
        }
        const badge = !unlocked ? (
          <Badge status="warning">{TEXT.cards.locked}</Badge>
        ) : sheetDone(sheet, state) ? (
          <Badge status="success">{TEXT.cards.done}</Badge>
        ) : sheetStarted(sheet, state) ? (
          <Badge status="info">{TEXT.cards.started}</Badge>
        ) : !teacher && !state.seen[sheet.id] ? (
          <Badge status="info">{TEXT.cards.new}</Badge>
        ) : null;
        return (
          <Card key={sheet.id} kind="action">
            <CardBody>
              <CardLink className="card__title" to={links.sheet(sheet.id)}>
                {title}
              </CardLink>
              {badge && <span className="kapitel-blatt__status">{badge}</span>}
            </CardBody>
            <ArrowRight className="card__cue" aria-hidden="true" />
          </Card>
        );
      })}
      {chapter.challenges.length > 0 && (
        <Card kind="action" surface="subtle">
          <CardBody>
            <span className="card__meta">{TEXT.cards.challengesMeta}</span>
            <CardLink className="card__title" to={links.challenges}>
              {TEXT.cards.challenges}
            </CardLink>
            <span className="kapitel-blatt__status">
              {fill(TEXT.cards.openOf, {
                open: teacher ? chapter.challenges.length : open,
                total: chapter.challenges.length,
              })}
            </span>
          </CardBody>
          <ArrowRight className="card__cue" aria-hidden="true" />
        </Card>
      )}
    </div>
  );
}
