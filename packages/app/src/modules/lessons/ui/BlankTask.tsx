import { RichContent, RichInlineContent } from "../../content-renderer";
import type { Task, Worksheet } from "../../catalog";
import { fill } from "../../../helper/text";
import type { Slide } from "../domain/deck";
import type { Blank } from "../domain/lesson";
import TEXT from "./lessons.de.json";

const LETTERS = "ABCDEFGH";

/** Gaps stay empty room to write in; the surface is the answer sheet. */
const renderGap = () => <span className="lf-blanktask__gap" />;

/** The task of the slide's worksheet that a blank surface was opened for. */
function taskOf(
  sheet: Worksheet | undefined,
  taskId: string,
): { task: Task; number: number } | undefined {
  const tasks = (sheet?.sections ?? []).flatMap((section) =>
    section.items.flatMap((item) => (item.type === "task" ? [item.task] : [])),
  );
  const index = tasks.findIndex((task) => task.id === taskId);
  const task = tasks[index];
  return task ? { task, number: index + 1 } : undefined;
}

/**
 * A task taken from the worksheet onto a blank surface: the prompt at the
 * top, the rest of the surface to write the solution on.
 */
export function BlankTask({ blank, parent }: { blank: Blank; parent: Slide }) {
  const found = blank.task && taskOf(parent.worksheet, blank.task.taskId);
  if (!found) {
    return null;
  }
  const parts = found.task.items.flatMap((item) =>
    item.type === "part" ? [item.part] : [],
  );
  return (
    <div className="lf-blanktask">
      <p className="lf-blanktask__label">
        {fill(TEXT.frame.taskOnBlank, { number: found.number })}
        {found.task.title ? ` · ${found.task.title}` : ""}
      </p>
      {parts.map((part, i) => (
        <div key={part.id} className="lf-blanktask__part">
          {parts.length > 1 && (
            <span className="lf-blanktask__letter">
              {String.fromCharCode(97 + i)})
            </span>
          )}
          <div>
            <RichContent
              nodes={part.content}
              className="lf-md"
              renderGap={renderGap}
            />
            {part.type === "Auswahl" && (
              <ol className="lf-blanktask__options">
                {(part.options ?? []).map((option, k) => (
                  <li key={k}>
                    <b>{LETTERS[k]}</b>{" "}
                    <RichInlineContent nodes={option.content} />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
