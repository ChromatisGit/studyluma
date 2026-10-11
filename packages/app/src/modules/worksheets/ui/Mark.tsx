import type { CheckResult, CheckState } from "../domain/contract";
import { TEXT } from "./texts";

/** The teacher's marks: hand-drawn strokes in the margin. */
export function MarkSymbol({ state }: { state: CheckState }) {
  return (
    <svg className="mark__sym" viewBox="0 0 24 24" aria-hidden="true">
      {state === "richtig" && (
        <path
          pathLength={1}
          d="M3.6 12.9c1.7 1.3 3.3 3.1 4.9 5.4 2.9-6 7-10.8 11.9-13.7"
        />
      )}
      {state === "fast" && (
        <>
          <path pathLength={1} d="M5.6 3.6c-2.6 4.6-2.6 12.2 0 16.8" />
          <path
            pathLength={1}
            d="M8.4 12.6c1 .8 2 2 2.9 3.4 1.7-3.4 3.6-5.9 5.6-7.4"
          />
          <path pathLength={1} d="M18.4 3.6c2.6 4.6 2.6 12.2 0 16.8" />
        </>
      )}
      {state === "nochNicht" && (
        <path
          pathLength={1}
          d="M13.4 4.3c4.2.4 7 3.9 6.6 8.1-.4 4.3-4 7.3-8.3 7-4.2-.4-7.3-3.9-7-8 .3-3.8 3-6.7 6.6-7.2"
        />
      )}
    </svg>
  );
}

/** A mark with its word and message, in the Korrekturrand. */
export function Mark({
  result,
  isNew = false,
}: {
  result: CheckResult;
  isNew?: boolean;
}) {
  return (
    <div className={`mark mark--${result.state}${isNew ? " is-new" : ""}`}>
      <MarkSymbol state={result.state} />
      <div className="mark__text">
        <strong className="mark__word">{TEXT.states[result.state]}</strong>
        {result.message && <span className="mark__msg">{result.message}</span>}
        {result.note && <span className="mark__msg">{result.note}</span>}
      </div>
    </div>
  );
}

/** A small mark inline, e.g. in the keypad display. */
export function InlineMark({ state }: { state: CheckState }) {
  return (
    <span className={`mark mark--inline mark--${state}`}>
      <MarkSymbol state={state} />
      <strong className="mark__word">{TEXT.states[state]}</strong>
    </span>
  );
}
