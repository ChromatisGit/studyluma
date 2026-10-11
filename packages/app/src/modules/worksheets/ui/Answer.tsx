import { InlineMath, splitTop } from "../../content-renderer";
import { fill } from "../../../helper/text";
import type { TaskPart } from "../../catalog";

import { MathField } from "./MathField";
import { useWorksheet } from "./WorksheetContext";
import { fieldRef, readSet } from "./fieldValues";
import { TEXT } from "./texts";

/**
 * A solution set: "L = { … }" with ";" between the solutions and a switch
 * for "no solution".
 */
function SetAnswer({ part, refText }: { part: TaskPart; refText: string }) {
  const { response, setResponseValue, active } = useWorksheet();
  const current = response(part.id);
  const check = current.lastCheck;
  const field = fieldRef(part.id);
  const set = readSet(current.value);
  const row = active?.ref.key === field.key ? active.editor.root : set.row;
  const segments = check?.items
    ? splitTop(row).map((_, i) => check.items?.[String(i)])
    : undefined;
  const toggleNone = () =>
    setResponseValue(part.id, ({ lastCheck: _cleared, ...rest }) => ({
      ...rest,
      value: { ...set, none: !set.none },
    }));
  return (
    <div className="set-answer">
      <div className="set">
        <span className="set__brace">{`${part.label ?? TEXT.set.defaultLabel} = {`}</span>
        {set.none ? (
          <span className="set__none">{TEXT.set.none}</span>
        ) : (
          <MathField
            field={field}
            label={fill(TEXT.aufgabe.setFor, { ref: refText })}
            state={check?.state}
            className="mfield--set"
            segments={segments}
          />
        )}
        <span className="set__brace">{"}"}</span>
      </div>
      <p className="set__help">
        {!set.none && (
          <span>
            {TEXT.set.separate} <kbd>;</kbd>
          </span>
        )}
        <button
          type="button"
          className="link-btn"
          aria-pressed={!!set.none}
          onClick={toggleNone}
        >
          {set.none ? TEXT.set.enterSolutions : TEXT.set.noSolution}
        </button>
      </p>
    </div>
  );
}

/**
 * The answer field of an Antwort. "f'(x) = …" in `::antwort` labels the
 * field with its left side, as in the Heft. A vector is typed as its
 * components with ";" between them.
 */
export function Answer({
  part,
  letter,
  refText,
}: {
  part: TaskPart;
  letter?: string | undefined;
  refText: string;
}) {
  const { response } = useWorksheet();
  const check = response(part.id).lastCheck;
  if (part.answerKind === "set") {
    return <SetAnswer part={part} refText={refText} />;
  }
  const vector = part.answerKind === "vector";
  return (
    <div className="antwort">
      {part.label ? (
        <span className="antwort__label antwort__label--math">
          <InlineMath math={`${part.label} =`} />
        </span>
      ) : (
        <span className="antwort__label antwort__label--text">
          {TEXT.aufgabe.result}
        </span>
      )}
      <MathField
        field={fieldRef(part.id)}
        label={fill(TEXT.aufgabe.resultFor, {
          ref: `${refText}${letter ?? ""}`,
        })}
        state={check?.state}
      />
      {vector && (
        <span className="set__help">
          {TEXT.vector.separate} <kbd>;</kbd>
        </span>
      )}
    </div>
  );
}
