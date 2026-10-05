import { Markdown } from "../../content";
import type { ErgebnisTask, Part } from "../domain/contract";
import { Answer } from "./Answer";
import { GapInput } from "./GapInput";
import { Mark } from "./Mark";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

/**
 * Plan and Rechenweg are one panel: the plan is the numbered steps; the
 * Rechenweg adds the gaps, and its last line holds the task's own answer.
 */
export function StepsPanel({
  part,
  level,
  refText,
}: {
  part: Part;
  level: number;
  refText: string;
}) {
  const { response, ui } = useWorksheet();
  const current = response(part.id);
  const rechenweg = level === 2;
  return (
    <div className={`weg weg--${rechenweg ? "rechenweg" : "plan"}`}>
      <p className="weg__label">
        {rechenweg ? TEXT.steps.rechenweg : TEXT.steps.plan}
      </p>
      <ol className="weg__list">
        {(part.steps ?? []).map((step, i) => {
          const own = current.steps?.[step.id];
          const values =
            (own?.value as Record<string, unknown> | undefined) ?? {};
          const items = own?.lastCheck?.items ?? {};
          return (
            <li key={step.id} className="weg__step">
              <span className="weg__num">{i + 1}</span>
              <span className="weg__name">
                <Markdown inline markdown={step.name} />
              </span>
              {rechenweg && step.line && (
                <span className="weg__line">
                  <Markdown
                    inline
                    markdown={step.line}
                    renderGap={(k) => {
                      const gap = step.gaps?.[k];
                      return gap ? (
                        <GapInput
                          gap={gap}
                          number={k + 1}
                          partId={part.id}
                          stepId={step.id}
                          value={values[gap.id]}
                          state={items[gap.id]}
                        />
                      ) : null;
                    }}
                  />
                </span>
              )}
              {rechenweg &&
                step.line &&
                own?.lastCheck &&
                own.lastCheck.state !== "richtig" && (
                  <span className="weg__mark">
                    <Mark
                      result={own.lastCheck}
                      isNew={!!ui.newMarks[step.id]}
                    />
                  </span>
                )}
              {rechenweg && !step.line && part.task.type === "ergebnis" && (
                <span className="weg__line weg__line--answer">
                  <Answer
                    part={part}
                    task={part.task as ErgebnisTask}
                    refText={refText}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
