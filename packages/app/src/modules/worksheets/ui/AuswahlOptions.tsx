import type { ReactNode } from "react";
import { Choice } from "@chromatis/base/ui";
import { RichInlineContent, type RichInline } from "../../content-renderer";
import type { CheckState } from "../domain/contract";
import "./worksheets.css";

const LETTERS = "ABCDEFGH";

const inlineLength = (nodes: RichInline[]): number =>
  nodes.reduce(
    (sum, node) =>
      sum +
      ("value" in node
        ? node.value.length
        : "source" in node
          ? node.source.length
          : "children" in node
            ? inlineLength(node.children)
            : 0),
    0,
  );

export interface AuswahlOptionsProps {
  /** Groups the inputs; unique per choice on the page. */
  name: string;
  legend: ReactNode;
  options: { id: string; content: RichInline[] }[];
  /** false = exactly one option → radio buttons. */
  multiple: boolean;
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Result tint per option id, e.g. after checking. */
  states?: Partial<Record<string, CheckState>>;
  disabled?: boolean;
}

/**
 * The options of an Auswahl: letters A, B, C in the written order, radio
 * buttons for one answer, checkboxes for several. Shared by worksheets and
 * the live quiz, so students recognise the control.
 */
export function AuswahlOptions({
  name,
  legend,
  options,
  multiple,
  selected,
  onChange,
  states,
  disabled = false,
}: AuswahlOptionsProps) {
  const short = options.every((option) => inlineLength(option.content) <= 14);
  const toggle = (id: string, on: boolean) =>
    onChange(
      multiple
        ? on
          ? [...selected, id]
          : selected.filter((other) => other !== id)
        : [id],
    );
  return (
    <fieldset
      className={[
        "auswahl",
        short && "auswahl--grid",
        disabled && "auswahl--locked",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <legend className="visually-hidden">{legend}</legend>
      {options.map((option, i) => (
        <Choice
          key={option.id}
          type={multiple ? "checkbox" : "radio"}
          name={name}
          value={option.id}
          checked={selected.includes(option.id)}
          onChange={(event) => toggle(option.id, event.target.checked)}
          disabled={disabled}
          className="option"
          data-state={states?.[option.id]}
          label={
            <>
              <span className="option__letter">{LETTERS[i]}</span>
              <RichInlineContent nodes={option.content} />
            </>
          }
        />
      ))}
    </fieldset>
  );
}
