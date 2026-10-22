import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { RichInlineContent, type GapNode } from "../../content-renderer";

type Choices = GapNode["choices"];

export interface GapSelectProps {
  choices: Choices;
  /** The chosen entry's `value`; "" when nothing is chosen yet. */
  value: string;
  label: string;
  locked: boolean;
  onChange: (value: string) => void;
}

/** Where the arrow keys move the highlight in a list of `count` entries. */
function moveTo(key: string, from: number, count: number): number | null {
  const last = count - 1;
  const moves: Record<string, number> = {
    ArrowDown: Math.min(from + 1, last),
    ArrowUp: Math.max(from - 1, 0),
    Home: 0,
    End: last,
  };
  return moves[key] ?? null;
}

/** Open, highlight and close; a tap anywhere else closes the list. */
function useListState(selected: number) {
  const root = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);
  const show = () => {
    setHighlighted(Math.max(selected, 0));
    setOpen(true);
  };
  return { root, open, setOpen, show, highlighted, setHighlighted };
}

function GapOptions({
  id,
  choices,
  selected,
  highlighted,
  onHighlight,
  onChoose,
}: {
  id: string;
  choices: Choices;
  selected: number;
  highlighted: number;
  onHighlight: (index: number) => void;
  onChoose: (index: number) => void;
}) {
  return (
    <ul className="gap__options" id={id} role="listbox">
      {choices.map((choice, index) => (
        <li
          key={choice.value}
          id={`${id}-${index}`}
          role="option"
          aria-selected={index === selected}
          className={index === highlighted ? "is-highlighted" : undefined}
          onPointerEnter={() => onHighlight(index)}
          // The button keeps the focus while an entry is chosen.
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => onChoose(index)}
        >
          <RichInlineContent nodes={choice.content} />
        </li>
      ))}
    </ul>
  );
}

/**
 * A dropdown gap. A native select shows plain text only; this list shows
 * each entry as written, formulas included.
 */
export function GapSelect({
  choices,
  value,
  label,
  locked,
  onChange,
}: GapSelectProps) {
  const listId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const selected = choices.findIndex((choice) => choice.value === value);
  const current = choices[selected];
  const { root, open, setOpen, show, highlighted, setHighlighted } =
    useListState(selected);

  const choose = (index: number) => {
    const choice = choices[index];
    if (choice) {
      onChange(choice.value);
    }
    setOpen(false);
    button.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const opens = ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key);
    const move = moveTo(event.key, highlighted, choices.length);
    if (!open && opens) {
      event.preventDefault();
      show();
    } else if (open && move !== null) {
      event.preventDefault();
      setHighlighted(move);
    } else if (open && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      choose(highlighted);
    } else if (open && (event.key === "Escape" || event.key === "Tab")) {
      setOpen(false);
    }
  };

  return (
    <span className="gap__picker" ref={root}>
      <button
        ref={button}
        type="button"
        className="gap__select"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${highlighted}` : undefined}
        data-filled={current ? true : undefined}
        disabled={locked}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        {current ? (
          <RichInlineContent nodes={current.content} />
        ) : (
          <span aria-hidden="true">&nbsp;</span>
        )}
      </button>
      <ChevronDown className="icon icon--sm chev" aria-hidden="true" />
      {open && (
        <GapOptions
          id={listId}
          choices={choices}
          selected={selected}
          highlighted={highlighted}
          onHighlight={setHighlighted}
          onChoose={choose}
        />
      )}
    </span>
  );
}
