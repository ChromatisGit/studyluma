import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";
import { Link } from "react-router";
import { Switch } from "@chromatis/base/ui";
import { fill } from "../../../helper/text";
import type { ChapterState } from "../domain/chapterState";
import type { Chapter, Sheet } from "../domain/contract";
import { isUnlocked, openChallenges, sheetDone } from "../domain/structure";
import { chapterStore } from "../infrastructure/localChapterStore";
import type { WorksheetLinks } from "./uiState";
import { TEXT } from "./texts";
import "./chapter-nav.css";

export type CurrentView =
  | { kind: "summary" }
  | { kind: "sheet"; sheetId: string }
  | { kind: "challenges" };

function SheetState({
  sheet,
  state,
  teacher,
}: {
  sheet: Sheet;
  state: ChapterState;
  teacher: boolean;
}) {
  if (sheetDone(sheet, state)) {
    return (
      <span
        className="kap-nav__state kap-nav__state--done"
        title={TEXT.sheet.doneTitle}
      >
        <Check className="icon" aria-hidden="true" />
        <span className="visually-hidden">{TEXT.nav.done}</span>
      </span>
    );
  }
  if (!isUnlocked(sheet, state)) {
    return (
      <span className="kap-nav__state">
        <Lock className="icon icon--sm" aria-hidden="true" />
        <span className="visually-hidden">{TEXT.nav.locked}</span>
      </span>
    );
  }
  return !teacher && !state.seen[sheet.id] ? (
    <span className="kap-nav__new">{TEXT.nav.new}</span>
  ) : null;
}

/** Worksheet navigation shared by the desktop sidebar and phone menu. */
// eslint-disable-next-line max-lines-per-function
export function ChapterNav({
  chapter,
  viewer,
  links,
  current,
  onNavigate,
}: {
  chapter: Chapter;
  viewer: Chapter["viewer"];
  links: WorksheetLinks;
  current: CurrentView;
  onNavigate?: () => void;
}) {
  const store = chapterStore(chapter.id);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const teacher = viewer === "teacher";
  const open = openChallenges(chapter, state).length;
  const [sheetsOpen, setSheetsOpen] = useState(current.kind === "sheet");
  const sheetsId = useId();

  useEffect(() => {
    if (current.kind === "sheet") {
      setSheetsOpen(true);
    }
  }, [current.kind]);

  return (
    <div className="kap-nav">
      <Link
        className={`kap-nav__item${current.kind === "summary" ? " is-current" : ""}`}
        to={`${links.summary}#zusammenfassung`}
        aria-current={current.kind === "summary" ? "page" : undefined}
        onClick={onNavigate}
      >
        <span className="kap-nav__t">{TEXT.nav.summary}</span>
      </Link>
      <button
        type="button"
        className="kap-nav__group-button"
        aria-expanded={sheetsOpen}
        aria-controls={sheetsId}
        onClick={() => setSheetsOpen((previous) => !previous)}
      >
        <span>{TEXT.nav.worksheets}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      <div
        className="kap-nav__sheets"
        id={sheetsId}
        data-open={sheetsOpen || undefined}
        aria-hidden={!sheetsOpen}
        inert={!sheetsOpen}
      >
        <div className="kap-nav__sheets-inner">
          <ol className="kap-nav__list">
            {chapter.sheets.map((sheet) => {
              const unlocked = isUnlocked(sheet, state);
              const isCurrent =
                current.kind === "sheet" && current.sheetId === sheet.id;
              const content = (
                <>
                  <span className="kap-nav__n">{sheet.number}</span>
                  <span className="kap-nav__t">{sheet.title}</span>
                  <SheetState sheet={sheet} state={state} teacher={teacher} />
                </>
              );
              const className = `kap-nav__item${isCurrent ? " is-current" : ""}${unlocked ? "" : " is-locked"}`;
              return (
                <li key={sheet.id} className="kap-nav__row">
                  {unlocked || teacher ? (
                    <Link
                      className={className}
                      to={links.sheet(sheet.id)}
                      aria-current={isCurrent ? "page" : undefined}
                      title={sheet.title}
                      onClick={onNavigate}
                    >
                      {content}
                    </Link>
                  ) : (
                    <span
                      className={className}
                      aria-disabled="true"
                      title={sheet.title}
                    >
                      {content}
                    </span>
                  )}
                  {teacher && (
                    <Switch
                      className="kap-nav__toggle"
                      label={unlocked ? TEXT.nav.unlocked : TEXT.nav.unlock}
                      aria-label={fill(TEXT.nav.unlockLabel, {
                        title: sheet.title,
                      })}
                      checked={unlocked}
                      onChange={(event) =>
                        store.setUnlocked(sheet.id, event.target.checked)
                      }
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <Link
        className={`kap-nav__item${current.kind === "challenges" ? " is-current" : ""}`}
        to={links.challenges}
        aria-current={current.kind === "challenges" ? "page" : undefined}
        onClick={onNavigate}
      >
        <span className="kap-nav__t">{TEXT.nav.challenges}</span>
        <span className="kap-nav__count">
          {teacher ? chapter.challenges.length : open}
        </span>
      </Link>
    </div>
  );
}
