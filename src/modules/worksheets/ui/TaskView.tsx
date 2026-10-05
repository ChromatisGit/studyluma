import { Markdown } from "../../content";
import { fill } from "../../../helper/text";
import type {
  AuftragTask,
  AuswahlTask,
  LueckentextTask,
  Part,
} from "../domain/contract";
import { Answer } from "./Answer";
import { AuswahlOptions } from "./AuswahlOptions";
import { GapInput } from "./GapInput";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

function LueckentextView({
  part,
  task,
}: {
  part: Part;
  task: LueckentextTask;
}) {
  const { response } = useWorksheet();
  const current = response(part.id);
  const values = (current.value as Record<string, unknown> | undefined) ?? {};
  const items = current.lastCheck?.items ?? {};
  return (
    <div className="task task--luecke">
      <Markdown
        markdown={task.body}
        renderGap={(i) => {
          const gap = task.gaps[i];
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
  task,
  refText,
}: {
  part: Part;
  task: AuswahlTask;
  refText: string;
}) {
  const { response, setInput } = useWorksheet();
  const current = response(part.id);
  const selected = Array.isArray(current.value)
    ? (current.value as string[])
    : [];
  const check = current.lastCheck;
  // Auswahl only says "Noch nicht" for the whole choice, not per option.
  const tinted = check && (!task.multiple || check.state === "richtig");
  const states = tinted
    ? Object.fromEntries(selected.map((id) => [id, check.state]))
    : undefined;
  return (
    <div className="task">
      <Markdown markdown={task.prompt} />
      <AuswahlOptions
        name={`opt-${part.id}`}
        legend={fill(TEXT.aufgabe.chooseFor, {
          ref: `${refText}${part.letter ?? ""}`,
        })}
        options={task.options}
        multiple={task.multiple}
        selected={selected}
        onChange={(next) => setInput({ partId: part.id }, next)}
        {...(states ? { states } : {})}
      />
    </div>
  );
}

function AuftragView({ part, task }: { part: Part; task: AuftragTask }) {
  const { response, setResponseValue } = useWorksheet();
  const value = response(part.id).value;
  return (
    <div className="task task--auftrag">
      <Markdown markdown={task.prompt} />
      {task.textfeld && (
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

/** The task of a part: Lückentext, Auswahl, Ergebnis or Auftrag. */
export function TaskView({
  part,
  refText,
  answerOnly = false,
}: {
  part: Part;
  refText: string;
  /** With a plan above it, an Ergebnis shows only its answer field. */
  answerOnly?: boolean;
}) {
  const task = part.task;
  switch (task.type) {
    case "lueckentext":
      return <LueckentextView part={part} task={task} />;
    case "auswahl":
      return <AuswahlView part={part} task={task} refText={refText} />;
    case "ergebnis":
      return answerOnly ? (
        <Answer part={part} task={task} refText={refText} />
      ) : (
        <div className="task">
          <Markdown markdown={task.prompt} />
          <Answer part={part} task={task} refText={refText} />
        </div>
      );
    default:
      return <AuftragView part={part} task={task} />;
  }
}
