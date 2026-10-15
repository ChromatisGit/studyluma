import { isUnlocked, type SheetsData, type Viewer } from "../domain/structure";
import { ChallengesPage } from "./ChallengesPage";
import type { CurrentView } from "./ChapterNav";
import { Keypad } from "./Keypad";
import { Pult } from "./Pult";
import { SheetPage } from "./SheetPage";
import {
  useWorksheetController,
  type WorksheetLinks,
} from "./useWorksheetController";
import { EmbedContext, WorksheetContext } from "./WorksheetContext";
import { TEXT } from "./texts";
import "./worksheets.css";

export interface WorksheetChapterProps {
  chapter: SheetsData;
  viewer: Viewer;
  view: CurrentView;
  links: WorksheetLinks;
  /** Inside the lesson: no navigation, tasks can go onto a blank surface. */
  embed?: boolean;
}

/**
 * A chapter's worksheet page or challenges, with its docked keypad.
 */
export function WorksheetChapter({
  chapter,
  viewer,
  view,
  links,
  embed = false,
}: WorksheetChapterProps) {
  const revalidator = useRevalidator();
  useEffect(() => {
    if (viewer !== "student") {
      return;
    }
    const timer = window.setInterval(() => revalidator.revalidate(), 10000);
    return () => window.clearInterval(timer);
  }, [viewer, revalidator]);
  const controller = useWorksheetController(chapter, viewer, links);
  const sheet =
    view.kind === "sheet"
      ? chapter.sheets.find((s) => s.id === view.sheetId)
      : undefined;
  if (
    sheet &&
    viewer === "student" &&
    !isUnlocked(chapter, sheet, controller.state)
  ) {
    return null;
  }
  return (
    <WorksheetContext.Provider value={controller}>
      <EmbedContext.Provider value={embed}>
        <div className="kapitel-app">
          <div className="kapitel-main" id="blatt">
            {view.kind === "challenges" ? (
              <ChallengesPage />
            ) : sheet ? (
              <SheetPage key={sheet.id} sheet={sheet} />
            ) : (
              <p className="ws">{TEXT.sheet.notFound}</p>
            )}
          </div>
          <Keypad />
          {!embed && <Pult current={view} />}
        </div>
      </EmbedContext.Provider>
    </WorksheetContext.Provider>
  );
}
import { useEffect } from "react";
import { useRevalidator } from "react-router";
