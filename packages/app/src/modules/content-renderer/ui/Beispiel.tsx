import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import TEXT from "./content.de.json";

/**
 * An example outside a Merkkarte (`::beispiel` in a chapter's content): one
 * click away, so students meet the rule before the instance.
 */
export function Beispiel({ children }: { children?: ReactNode }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="beispiel">
      <button
        type="button"
        className="beispiel__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? TEXT.merkkarte.hideExample : TEXT.merkkarte.showExample}
        <ChevronDown className="icon" aria-hidden="true" />
      </button>
      <div className="beispiel__panel" id={panelId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
