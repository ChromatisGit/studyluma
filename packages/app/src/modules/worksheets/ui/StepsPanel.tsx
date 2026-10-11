import { RichInlineContent } from "../../content-renderer";
import type { TaskPart } from "../../catalog";
import { Answer } from "./Answer";
import { GapInput } from "./GapInput";
import { Mark } from "./Mark";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

/**
 * Plan and Rechenweg are one panel: the plan is the numbered steps; the
 * Rechenweg adds the gaps, and its last step without gaps holds the task's
 * own answer.
 */
export function StepsPanel({
  part,
  letter,
  level,
  refText,
}: {
  part: TaskPart;
  letter?: string | undefined;
  level: number;
  refText: string;
}) {
  const { response, ui } = useWorksheet();
  const current = response(part.id);
  const rechenweg = level === 2 && part.steps?.kind === "rechenweg";
  const items = part.steps?.items ?? [];
  const lastHasGaps = !!items.at(-1)?.content.some((n) => n.type === "gap");
  return (
    <div className={`weg weg--${rechenweg ? "rechenweg" : "plan"}`}>
      <p className="weg__label">
        {rechenweg ? TEXT.steps.rechenweg : TEXT.steps.plan}
      </p>
      <ol className="weg__list">
        {items.map((step, i) => {
          const own = current.steps?.[step.id];
          const values =
            (own?.value as Record<string, unknown> | undefined) ?? {};
          const states = own?.lastCheck?.items ?? {};
          const hasGaps = step.content.some((node) => node.type === "gap");
          const last = i === items.length - 1;
          let number = 0;
          return (
            <li key={step.id} className="weg__step">
              <span className="weg__num">{i + 1}</span>
              <span className="weg__name">
                <RichInlineContent
                  nodes={step.content}
                  renderGap={(id) => {
                    const gap = step.content.find(
                      (node) => node.type === "gap" && node.id === id,
                    );
                    number += 1;
                    if (!rechenweg || gap?.type !== "gap") {
                      return "…";
                    }
                    return (
                      <GapInput
                        gap={gap}
                        number={number}
                        partId={part.id}
                        stepId={step.id}
                        value={values[gap.id]}
                        state={states[gap.id]}
                      />
                    );
                  }}
                />
              </span>
              {rechenweg &&
                hasGaps &&
                own?.lastCheck &&
                own.lastCheck.state !== "richtig" && (
                  <span className="weg__mark">
                    <Mark
                      result={own.lastCheck}
                      isNew={!!ui.newMarks[step.id]}
                    />
                  </span>
                )}
              {rechenweg && last && !hasGaps && part.type === "Antwort" && (
                <span className="weg__line weg__line--answer">
                  <Answer part={part} letter={letter} refText={refText} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {rechenweg && lastHasGaps && part.type === "Antwort" && (
        <Answer part={part} letter={letter} refText={refText} />
      )}
    </div>
  );
}
