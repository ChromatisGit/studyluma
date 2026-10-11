import type { SheetsData } from "../domain/structure";
import { AufgabeView } from "./AufgabeView";
import { Keypad } from "./Keypad";
import { useWorksheetController } from "./useWorksheetController";
import { WorksheetContext } from "./WorksheetContext";
import "./worksheets.css";

const noLinks = { chapter: "", summary: "", challenges: "", sheet: () => "" };

/**
 * One real task outside its sheet, e.g. on a landing page. It saves under
 * its own key, so trying it doesn't touch the chapter's answers.
 */
export function TaskSample({
  chapter,
  aufgabeId,
}: {
  chapter: SheetsData;
  aufgabeId: string;
}) {
  const sample = { ...chapter, id: `sample-${chapter.id}` };
  const controller = useWorksheetController(sample, "student", noLinks);
  const info = controller.index.aufgaben.get(aufgabeId);
  if (!info) {
    return null;
  }
  return (
    <WorksheetContext.Provider value={controller}>
      <div className="kapitel-app task-sample">
        <div className="kapitel-main">
          <div className="ws">
            <AufgabeView info={info} />
          </div>
        </div>
        <Keypad />
      </div>
    </WorksheetContext.Provider>
  );
}
