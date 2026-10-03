import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

/** The sheet's head on squared paper, with the highlighter swept once. */
export function SheetHeader({
  meta,
  title,
  lead,
  dark = false,
  modeLine,
}: {
  meta: string;
  title: string;
  lead?: string | undefined;
  dark?: boolean;
  modeLine?: ReactNode;
}) {
  const { ui, setUi } = useWorksheet();
  return (
    <header className={`page-top${dark ? " page-top--dark" : ""}`}>
      <div className="page-top__inner">
        <div className="sheet-id">
          <button
            type="button"
            className="kapitel-btn"
            aria-expanded={ui.drawer}
            onClick={() =>
              setUi((current) => ({ ...current, drawer: !current.drawer }))
            }
          >
            <Menu className="icon icon--sm" aria-hidden="true" />
            <span>{TEXT.nav.open}</span>
          </button>
          <p className="sheet-id__meta">{meta}</p>
        </div>
        <h1 className="page-top__title" id="page-title" tabIndex={-1}>
          <span className="hl is-anim">{title}</span>
        </h1>
        {lead && <p className="page-top__lead">{lead}</p>}
        {modeLine}
      </div>
    </header>
  );
}
