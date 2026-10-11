import {
  GraphicView,
  InlineMath,
  RichContent,
  gapsOf,
  inputGraphicOf,
  type DrawnFunction,
} from "../../content-renderer";
import { fill } from "../../../helper/text";
import type { TaskPart } from "../../catalog";
import { optionId } from "../domain/check";
import { Answer } from "./Answer";
import { MathField } from "./MathField";
import { fieldRef, readField } from "./fieldValues";
import { AuswahlOptions } from "./AuswahlOptions";
import { GapInput } from "./GapInput";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

function EinsetzenView({ part }: { part: TaskPart }) {
  const { response } = useWorksheet();
  const current = response(part.id);
  const values = (current.value as Record<string, unknown> | undefined) ?? {};
  const items = current.lastCheck?.items ?? {};
  const gaps = gapsOf(part.content);
  return (
    <div className="task task--luecke">
      <RichContent
        nodes={part.content}
        renderGap={(id) => {
          const i = gaps.findIndex((gap) => gap.id === id);
          const gap = gaps[i];
          return gap ? (
            <GapInput
              gap={gap}
              number={i + 1}
              partId={part.id}
              value={values[gap.id]}
              state={items[gap.id]}
            />
          ) : null;
        }}
      />
    </div>
  );
}

function AuswahlView({
  part,
  letter,
  refText,
}: {
  part: TaskPart;
  letter?: string | undefined;
  refText: string;
}) {
  const { response, setInput } = useWorksheet();
  const current = response(part.id);
  const selected = Array.isArray(current.value)
    ? (current.value as string[])
    : [];
  const check = current.lastCheck;
  const multiple = !!part.multiple;
  // Auswahl only says "Noch nicht" for the whole choice, not per option.
  const tinted = check && (!multiple || check.state === "richtig");
  const states = tinted
    ? Object.fromEntries(selected.map((id) => [id, check.state]))
    : undefined;
  return (
    <div className="task">
      <RichContent nodes={part.content} />
      <AuswahlOptions
        name={`opt-${part.id}`}
        legend={fill(TEXT.aufgabe.chooseFor, {
          ref: `${refText}${letter ?? ""}`,
        })}
        options={(part.options ?? []).map((option, i) => ({
          id: optionId(part.id, i),
          content: option.content,
        }))}
        multiple={multiple}
        selected={selected}
        onChange={(next) => setInput({ partId: part.id }, next)}
        {...(states ? { states } : {})}
      />
    </div>
  );
}

/**
 * A Graph: the text, then the Grafik as workspace with one function field
 * per expected function. What is typed is drawn at once.
 */
function GraphView({
  part,
  letter,
  refText,
}: {
  part: TaskPart;
  letter?: string | undefined;
  refText: string;
}) {
  const { response, active } = useWorksheet();
  const current = response(part.id);
  const workspace = inputGraphicOf(part.content);
  const count = workspace?.graphic.input?.count ?? 1;
  const slots = Array.from({ length: count }, (_, slot) => {
    const field = fieldRef(part.id, undefined, String(slot));
    const row =
      active?.ref.key === field.key
        ? active.editor.root
        : readField(current, field);
    return { slot, field, row };
  });
  const drawn: DrawnFunction[] = slots
    .filter(({ row }) => row.length)
    .map(({ slot, row }) => ({ slot, row }));
  return (
    <div className="task task--graph">
      <RichContent
        nodes={part.content.filter(
          (node) => node.type !== "graphic" || !node.graphic.input,
        )}
      />
      {workspace && (
        <GraphicView
          graphic={workspace.graphic}
          title={workspace.title}
          drawn={drawn}
        />
      )}
      <p className="graph__hint">{TEXT.graph.hint}</p>
      {slots.map(({ slot, field }) => (
        <div className="antwort" key={slot}>
          <span className="antwort__label antwort__label--math">
            <InlineMath math="y =" />
          </span>
          <MathField
            field={field}
            label={fill(TEXT.graph.functionFor, {
              number: slot + 1,
              ref: `${refText}${letter ?? ""}`,
            })}
            state={current.lastCheck?.items?.[String(slot)]}
          />
        </div>
      ))}
    </div>
  );
}

function AuftragView({ part }: { part: TaskPart }) {
  const { response, setResponseValue } = useWorksheet();
  const value = response(part.id).value;
  return (
    <div className="task task--auftrag">
      <RichContent nodes={part.content} />
      {part.markers.textfeld && (
        <label className="textfeld">
          <span className="textfeld__label">{TEXT.aufgabe.yourAnswer}</span>
          <textarea
            className="textarea"
            rows={5}
            value={typeof value === "string" ? value : ""}
            onChange={(event) =>
              setResponseValue(part.id, (old) => ({
                ...old,
                value: event.target.value,
              }))
            }
          />
        </label>
      )}
    </div>
  );
}

/** The task of a part: Einsetzen, Auswahl, Antwort or Auftrag. */
export function TaskView({
  part,
  letter,
  refText,
  answerOnly = false,
}: {
  part: TaskPart;
  letter?: string | undefined;
  refText: string;
  /** With a plan above it, an Antwort shows only its answer field. */
  answerOnly?: boolean;
}) {
  switch (part.type) {
    case "Einsetzen":
      return <EinsetzenView part={part} />;
    case "Auswahl":
      return <AuswahlView part={part} letter={letter} refText={refText} />;
    case "Antwort":
      return answerOnly ? (
        <Answer part={part} letter={letter} refText={refText} />
      ) : (
        <div className="task">
          <RichContent nodes={part.content} />
          <Answer part={part} letter={letter} refText={refText} />
        </div>
      );
    case "Graph":
      return <GraphView part={part} letter={letter} refText={refText} />;
    default:
      return <AuftragView part={part} />;
  }
}
