import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@chromatis/base/ui";
import TEXT from "./content.de.json";

/** Wraps the examples of a Merkkarte (`::beispiel` in Markdown). */
export function MerkkarteBeispiel({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export interface MerkkarteProps {
  id?: string | undefined;
  title: string;
  children?: ReactNode;
  /** h4 inside a summary (below its section headings); h3 elsewhere. */
  headingLevel?: 3 | 4;
  /** Context in a worksheet hint: "9.2 · Die Ableitungsregeln". */
  origin?: string | undefined;
  /** Open the examples right away, e.g. on the last step of a hint. */
  defaultExampleOpen?: boolean;
  className?: string;
}

/**
 * A Merkkarte: framework Card with one violet rule under the title. The
 * general form is always visible; examples are one click away so students
 * meet the rule before the instance.
 */
export function Merkkarte({
  id,
  title,
  children,
  headingLevel = 4,
  origin,
  defaultExampleOpen = false,
  className,
}: MerkkarteProps) {
  const exampleId = useId();
  const [open, setOpen] = useState(defaultExampleOpen);
  const parts = Children.toArray(children);
  const examples = parts.filter(
    (part) => isValidElement(part) && part.type === MerkkarteBeispiel,
  );
  const body = parts.filter((part) => !examples.includes(part));
  const Heading = headingLevel === 3 ? "h3" : "h4";

  useEffect(() => {
    setOpen(defaultExampleOpen);
  }, [defaultExampleOpen]);

  // Arriving via #id (from a worksheet hint) shows the full context.
  useEffect(() => {
    if (id && window.location.hash === `#${id}`) {
      setOpen(true);
    }
  }, [id]);

  return (
    <Card
      id={id}
      className={["merkkarte", className].filter(Boolean).join(" ")}
      surface="default"
      border="default"
    >
      <header className="merkkarte__head">
        {origin && <p className="merkkarte__origin">{origin}</p>}
        <Heading className="merkkarte__title">{title}</Heading>
      </header>
      <div className="merkkarte__body">
        {body}
        {examples.length > 0 && (
          <button
            type="button"
            className="merkkarte__toggle"
            aria-expanded={open}
            aria-controls={exampleId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? TEXT.merkkarte.hideExample : TEXT.merkkarte.showExample}
            <ChevronDown className="icon" aria-hidden="true" />
          </button>
        )}
        {examples.length > 0 && (
          <div className="merkkarte__example" id={exampleId} hidden={!open}>
            {examples}
          </div>
        )}
      </div>
    </Card>
  );
}
