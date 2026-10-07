import { ChevronDown, LockOpen } from "lucide-react";
import { Markdown } from "../../content";
import type { Aufgabe } from "../domain/contract";
import { checkedOnce, isCheckable, isReleased } from "../domain/structure";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

/**
 * The Musterlösung. Students see it only once the teacher released it,
 * and only after checking their own answer; teachers always see it and
 * release it right here.
 */
export function Solution({ aufgabe }: { aufgabe: Aufgabe }) {
  const { teacher, state, ui, setUi } = useWorksheet();
  const solution = aufgabe.solution;
  const released = isReleased(aufgabe, state);
  if (!solution || solution.state === "locked" || (!teacher && !released)) {
    return null;
  }
  const parts = "parts" in solution ? solution.parts : [];
  const open = !!ui.solutionOpen[aufgabe.id];
  const checkable = aufgabe.parts.filter(isCheckable);
  const gated =
    !teacher &&
    checkable.length > 0 &&
    !checkable.some((part) => checkedOnce(state.responses[part.id]));
  const multi = aufgabe.parts.length > 1;
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
          parts.map((part) => (
            <div key={part.partId} className="loesung__part">
              {multi && part.letter && (
                <span className="part__letter">{part.letter})</span>
              )}
              <Markdown markdown={part.body} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
