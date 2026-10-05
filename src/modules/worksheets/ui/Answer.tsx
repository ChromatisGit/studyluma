import { InlineMath } from "../../content";
import { fill } from "../../../helper/text";
import type { ErgebnisTask, Part } from "../domain/contract";
import { splitTop } from "../domain/mathNodes";
import { MathField } from "./MathField";
import { useWorksheet } from "./WorksheetContext";
import { fieldRef, readSet } from "./fieldValues";
import { TEXT } from "./texts";

/**
 * The answer field of an Ergebnis. "f'(x) = …" in `::antwort` labels the
 * field with its left side, as in the Heft; sets get braces and ";".
 */
export function Answer({
  part,
  task,
  refText,
}: {
  part: Part;
  task: ErgebnisTask;
  refText: string;
}) {
  const { response, setResponseValue, active } = useWorksheet();
  const current = response(part.id);
  const check = current.lastCheck;
  const field = fieldRef(part.id);

  if (task.answer.kind === "set") {
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
          <span className="set__brace">{`${task.label ?? TEXT.set.defaultLabel} = {`}</span>
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

  return (
    <div className="antwort">
      {task.label ? (
        <span className="antwort__label antwort__label--math">
          <InlineMath math={`${task.label} =`} />
        </span>
      ) : (
        <span className="antwort__label antwort__label--text">
          {TEXT.aufgabe.result}
        </span>
      )}
      <MathField
        field={field}
        label={fill(TEXT.aufgabe.resultFor, {
          ref: `${refText}${part.letter ?? ""}`,
        })}
        state={check?.state}
      />
    </div>
  );
}
