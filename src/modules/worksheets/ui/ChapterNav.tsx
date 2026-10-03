import { useEffect, useRef } from "react";
import { Check, Lock, X } from "lucide-react";
import { Link } from "react-router";
import { Switch } from "@chromatis/base/ui";
import { fill } from "../../../helper/text";
import type { Sheet } from "../domain/contract";
import { isUnlocked, openChallenges, sheetDone } from "../domain/structure";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

export type CurrentView =
  { kind: "sheet"; sheetId: string } | { kind: "challenges" };

function SheetState({ sheet }: { sheet: Sheet }) {
  const { state, teacher } = useWorksheet();
  if (sheetDone(sheet, state)) {
    return (
      <span
        className="kap-nav__state kap-nav__state--done"
        title={TEXT.sheet.doneTitle}
      >
        <Check className="icon" aria-hidden="true" />
        <span className="visually-hidden">{TEXT.nav.done}</span>
      </span>
    );
  }
  if (!isUnlocked(sheet, state)) {
    return (
      <span className="kap-nav__state">
        <Lock className="icon icon--sm" aria-hidden="true" />
        <span className="visually-hidden">{TEXT.nav.locked}</span>
      </span>
    );
  }
  return !teacher && !state.seen[sheet.id] ? (
    <span className="kap-nav__new">{TEXT.nav.new}</span>
  ) : null;
}

/** The chapter: summary, sheets with their state, challenges. */
export function ChapterNav({
  current,
  onNavigate,
}: {
  current: CurrentView;
  onNavigate?: () => void;
}) {
  const { chapter, state, store, teacher, links } = useWorksheet();
  const open = openChallenges(chapter, state).length;
  const onChallenges = current.kind === "challenges";
  return (
    <nav
      className="kap-nav"
      aria-label={fill(TEXT.nav.label, { number: chapter.number })}
    >
      <div className="kap-nav__head">
        <p className="kap-nav__num">
          {fill(TEXT.nav.chapter, { number: chapter.number })}
        </p>
        <p className="kap-nav__title">{chapter.title}</p>
      </div>
      <Link
        className="kap-nav__item"
        to={`${links.summary}#zusammenfassung`}
        onClick={onNavigate}
      >
        <span className="kap-nav__t">{TEXT.nav.summary}</span>
      </Link>
      <p className="kap-nav__group">{TEXT.nav.worksheets}</p>
      <ol className="kap-nav__list">
        {chapter.sheets.map((sheet) => {
          const unlocked = isUnlocked(sheet, state);
          const isCurrent =
            current.kind === "sheet" && current.sheetId === sheet.id;
          const content = (
            <>
              <span className="kap-nav__n">{sheet.number}</span>
              <span className="kap-nav__t">{sheet.title}</span>
              <SheetState sheet={sheet} />
            </>
          );
          const className = `kap-nav__item${isCurrent ? " is-current" : ""}${unlocked ? "" : " is-locked"}`;
          return (
            <li key={sheet.id} className="kap-nav__row">
              {unlocked || teacher ? (
                <Link
                  className={className}
                  to={links.sheet(sheet.id)}
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={onNavigate}
                >
                  {content}
                </Link>
              ) : (
                <span className={className} aria-disabled="true">
                  {content}
                </span>
              )}
              {teacher && (
                <Switch
                  className="kap-nav__toggle"
                  label={unlocked ? TEXT.nav.unlocked : TEXT.nav.unlock}
                  aria-label={fill(TEXT.nav.unlockLabel, {
                    title: sheet.title,
                  })}
                  checked={unlocked}
                  onChange={(event) =>
                    store.setUnlocked(sheet.id, event.target.checked)
                  }
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="kap-nav__group">{TEXT.nav.fast}</p>
      <Link
        className={`kap-nav__item${onChallenges ? " is-current" : ""}`}
        to={links.challenges}
        aria-current={onChallenges ? "page" : undefined}
        onClick={onNavigate}
      >
        <span className="kap-nav__t">{TEXT.nav.challenges}</span>
        <span className="kap-nav__count">
          {teacher ? chapter.challenges.length : open}
        </span>
      </Link>
    </nav>
  );
}

/** The same list in a drawer when there is no room for the sidebar. */
export function ChapterDrawer({ current }: { current: CurrentView }) {
  const { ui, setUi } = useWorksheet();
  const panel = useRef<HTMLDivElement>(null);
  const close = () => setUi((state) => ({ ...state, drawer: false }));
  useEffect(() => {
    if (!ui.drawer) {
      return undefined;
    }
    panel.current
      ?.querySelector<HTMLElement>(".is-current, .kap-nav__item")
      ?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUi((state) => ({ ...state, drawer: false }));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ui.drawer, setUi]);
  if (!ui.drawer) {
    return null;
  }
  return (
    <div className="drawer">
      <div className="drawer__scrim" onClick={close} />
      <div
        className="drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label={TEXT.nav.open}
        ref={panel}
      >
        <button
          type="button"
          className="btn btn--ghost btn--sm drawer__close"
          onClick={close}
        >
          <X className="icon icon--sm" aria-hidden="true" />
          {TEXT.nav.close}
        </button>
        <ChapterNav current={current} onNavigate={close} />
      </div>
    </div>
  );
}
