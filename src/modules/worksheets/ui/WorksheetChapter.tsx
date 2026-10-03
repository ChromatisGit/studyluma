import type { ViewerRole } from "../../viewer";
import type { Chapter } from "../domain/contract";
import { ChallengesPage } from "./ChallengesPage";
import { ChapterDrawer, ChapterNav, type CurrentView } from "./ChapterNav";
import { Keypad } from "./Keypad";
import { Pult } from "./Pult";
import { SheetPage } from "./SheetPage";
import {
  useWorksheetController,
  type WorksheetLinks,
} from "./useWorksheetController";
import { WorksheetContext } from "./WorksheetContext";
import { TEXT } from "./texts";
import "./worksheets.css";

export interface WorksheetChapterProps {
  chapter: Chapter;
  viewer: ViewerRole;
  view: CurrentView;
  links: WorksheetLinks;
}

/**
 * A chapter's worksheet pages: the chapter sidebar (a drawer when narrow),
 * a sheet or the challenges, and the docked keypad.
 */
export function WorksheetChapter({
  chapter,
  viewer,
  view,
  links,
}: WorksheetChapterProps) {
  const controller = useWorksheetController(chapter, viewer, links);
  const sheet =
    view.kind === "sheet"
      ? chapter.sheets.find((s) => s.id === view.sheetId)
      : undefined;
  return (
    <WorksheetContext.Provider value={controller}>
      <div className="kapitel-app">
        <div className="kapitel-layout">
          <aside className="kapitel-side">
            <ChapterNav current={view} />
          </aside>
          <main className="kapitel-main" id="blatt">
            {view.kind === "challenges" ? (
              <ChallengesPage />
            ) : sheet ? (
              <SheetPage key={sheet.id} sheet={sheet} />
            ) : (
              <p className="ws">{TEXT.sheet.notFound}</p>
            )}
          </main>
        </div>
        <Keypad />
        <ChapterDrawer current={view} />
        <Pult current={view} />
      </div>
    </WorksheetContext.Provider>
  );
}
