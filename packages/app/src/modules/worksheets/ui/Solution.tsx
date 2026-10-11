import { ChevronDown, LockOpen } from "lucide-react";
import { RichContent } from "../../content-renderer";
import {
  checkedOnce,
  isCheckable,
  isReleased,
  solutionParts,
  type AufgabeInfo,
} from "../domain/structure";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

/**
 * The Musterlösung. Students see it only once the teacher released it,
 * and only after checking their own answer; teachers always see it and
 * release it right here.
 */
export function Solution({ info }: { info: AufgabeInfo }) {
  const { chapter, teacher, state, ui, setUi } = useWorksheet();
  const { aufgabe } = info;
  const parts = solutionParts(info);
  const released = isReleased(aufgabe, state, chapter);
  if (!parts.length || (!teacher && !released)) {
    return null;
  }
  const open = !!ui.solutionOpen[aufgabe.id];
  const checkable = info.parts.map((p) => p.part).filter(isCheckable);
  const gated =
    !teacher &&
    checkable.length > 0 &&
    !checkable.some((part) => checkedOnce(state.responses[part.id]));
  const multi = info.parts.length > 1;
  const bodyId = `sol-${aufgabe.id}`;
  return (
    <div className={`loesung loesung--open${open ? " is-expanded" : ""}`}>
      <div className="loesung__row">
        <button
          type="button"
          className="loesung__toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() =>
            setUi((current) => ({
              ...current,
              solutionOpen: { ...current.solutionOpen, [aufgabe.id]: !open },
            }))
          }
        >
          {!teacher && (
            <LockOpen className="icon icon--sm" aria-hidden="true" />
          )}
          <span>{open ? TEXT.solution.hide : TEXT.solution.show}</span>
          <ChevronDown className="icon icon--sm chev" aria-hidden="true" />
        </button>
      </div>
      <div className="loesung__body" id={bodyId} hidden={!open}>
        {gated ? (
          <p className="loesung__gate">{TEXT.solution.gate}</p>
        ) : (
          parts.map(({ part, letter }) => (
            <div key={part.id} className="loesung__part">
              {multi && letter && (
                <span className="part__letter">{letter})</span>
              )}
              <RichContent nodes={part.markers.loesung ?? []} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
