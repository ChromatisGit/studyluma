import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { ArrowRight } from "lucide-react";
import { RichInlineContent } from "../../content-renderer";
import { Linie, LinieStop } from "../../linie";
import type { Steps, TaskPart } from "../../catalog";
import { activeStep, answerLocked } from "../domain/structure";
import { GapInput } from "./GapInput";
import { Mark } from "./Mark";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

const hasValue = (value: unknown) =>
  typeof value === "string"
    ? value.trim().length > 0
    : Array.isArray(value) && value.length > 0;

/** One step on the line: its text with the gaps, and while active the way to check it. */
function StepRow({
  part,
  step,
  active,
  trail,
  first,
  rowRef,
}: {
  part: TaskPart;
  step: Steps["items"][number];
  /** The step being worked on; the others are done and locked. */
  active: boolean;
  /** The dashed trail starts below this step. */
  trail: boolean;
  first: boolean;
  rowRef: RefObject<HTMLDivElement | null>;
}) {
  const { response, ui, checkStep } = useWorksheet();
  const own = response(part.id).steps?.[step.id];
  const values = (own?.value as Record<string, unknown> | undefined) ?? {};
  const states = own?.lastCheck?.items ?? {};
  const gaps = step.content.filter((node) => node.type === "gap");
  return (
    <LinieStop
      kind="step"
      status={active ? "current" : "done"}
      up={first ? "none" : "done"}
      down="done"
      trail={trail}
      className={[
        "weg__row",
        active && "weg__row--active",
        trail && "weg__row--trail",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="weg__step" ref={active ? rowRef : undefined}>
        <RichInlineContent
          nodes={step.content}
          renderGap={(id) => {
            const gap = gaps.find((node) => node.id === id);
            if (gap?.type !== "gap") {
              return null;
            }
            return (
              <GapInput
                gap={gap}
                number={gaps.indexOf(gap) + 1}
                partId={part.id}
                stepId={step.id}
                value={values[gap.id]}
                state={states[gap.id]}
                locked={!active}
              />
            );
          }}
        />
        {active && (
          <button
            type="button"
            className="weg__go"
            aria-label={TEXT.steps.check}
            disabled={!gaps.every((gap) => hasValue(values[gap.id]))}
            onClick={() => checkStep(part.id, step.id)}
          >
            <ArrowRight className="icon icon--sm" aria-hidden="true" />
          </button>
        )}
      </div>
      {active && own?.lastCheck && own.lastCheck.state !== "richtig" && (
        <div className="weg__mark">
          <Mark result={own.lastCheck} isNew={!!ui.newMarks[step.id]} />
        </div>
      )}
    </LinieStop>
  );
}

/**
 * The way to the answer, one step at a time: finished steps rest on the line,
 * the active one is open, and a dashed trail runs on without saying how far.
 * The answer field (`children`) is the last station and always stays live.
 */
export function StepsPanel({
  part,
  focusFirst,
  children,
}: {
  part: TaskPart;
  /** Put the cursor into the first step when the panel appears. */
  focusFirst: boolean;
  /** The part's answer field. */
  children: ReactNode;
}) {
  const { response } = useWorksheet();
  const current = response(part.id);
  const items = part.steps?.items ?? [];
  const solved = answerLocked(part, current);
  const active = activeStep(part, current);
  const shown = items.slice(0, solved ? active : active + 1);
  const activeRow = useRef<HTMLDivElement>(null);
  const seen = useRef(focusFirst ? -1 : active);

  // A step that was just solved hands the cursor to the next one.
  useEffect(() => {
    if (active > seen.current && active < items.length) {
      activeRow.current
        ?.querySelector<HTMLElement>(".mfield, input, .gap__select")
        ?.focus();
    }
    seen.current = active;
  }, [active, items.length]);

  if (!shown.length) {
    return <>{children}</>;
  }
  return (
    <Linie label={TEXT.steps.label} className="weg">
      {shown.map((step, i) => (
        <StepRow
          key={step.id}
          part={part}
          step={step}
          active={!solved && i === active}
          trail={!solved && i === shown.length - 1}
          first={i === 0}
          rowRef={activeRow}
        />
      ))}
      <LinieStop
        kind="step"
        status={solved ? "done" : "ahead"}
        up={solved ? "done" : "ahead"}
        down="none"
        dashed={!solved}
        className="weg__row weg__row--answer"
      >
        {children}
      </LinieStop>
    </Linie>
  );
}
