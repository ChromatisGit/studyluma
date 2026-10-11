import { ChevronDown } from "lucide-react";
import { fill } from "../../../helper/text";
import type { GapNode } from "../../content-renderer";
import type { CheckState } from "../domain/contract";
import { MarkSymbol } from "./Mark";
import { MathField } from "./MathField";
import { useWorksheet } from "./WorksheetContext";
import { fieldRef } from "./fieldValues";
import { TEXT } from "./texts";

export interface GapInputProps {
  gap: GapNode;
  /** 1-based number for the accessible name. */
  number: number;
  partId: string;
  stepId?: string | undefined;
  value: unknown;
  state?: CheckState | undefined;
}

/** One gap: a dropdown, a text field or a small math field. */
export function GapInput({
  gap,
  number,
  partId,
  stepId,
  value,
  state,
}: GapInputProps) {
  const { setInput, checkAufgabe, checkStep, index } = useWorksheet();
  const label = fill(TEXT.aufgabe.gap, { number });
  const kind = gap.inputKind ?? (gap.choices.length > 1 ? "dropdown" : "math");
  const className = [
    "gap",
    `gap--${kind === "dropdown" ? "select" : kind}`,
    state === "nochNicht" && "gap--wrong",
    state === "fast" && "gap--fast",
  ]
    .filter(Boolean)
    .join(" ");
  const save = (next: unknown) =>
    setInput({ partId, stepId, gapId: gap.id }, next);
  const check = () => {
    if (stepId) {
      checkStep(partId, stepId);
      return;
    }
    const aufgabeId = index.parts.get(partId)?.info.aufgabe.id;
    if (aufgabeId) {
      checkAufgabe(aufgabeId);
    }
  };

  if (kind === "dropdown") {
    return (
      <span className={className} data-state={state}>
        <select
          aria-label={label}
          required
          value={typeof value === "string" ? value : ""}
          onChange={(event) => save(event.target.value)}
        >
          <option value="" disabled />
          {gap.choices.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className="icon icon--sm chev" aria-hidden="true" />
      </span>
    );
  }
  if (kind === "text") {
    return (
      <span className={className} data-state={state}>
        <input
          type="text"
          aria-label={label}
          placeholder=" "
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => save(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              check();
            }
          }}
        />
      </span>
    );
  }
  return (
    <span className={className} data-state={state}>
      <MathField
        field={fieldRef(partId, stepId, gap.id)}
        label={label}
        small
        state={state}
      />
      {state === "fast" && (
        <span className="gap__fast" aria-label={TEXT.states.fast}>
          <MarkSymbol state="fast" />
        </span>
      )}
    </span>
  );
}
