import type { ReactNode } from "react";

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
  return (
    <header className={`page-top${dark ? " page-top--dark" : ""}`}>
      <div className="page-top__inner">
        <div className="sheet-id">
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
