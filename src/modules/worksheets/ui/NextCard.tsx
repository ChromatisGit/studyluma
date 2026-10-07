import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { plural } from "../../../helper/text";
import type { Section, Sheet } from "../domain/contract";
import {
  openChallenges,
  recommendation,
  sectionDone,
} from "../domain/structure";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

/** End of a tab: the next tab. End of the sheet: the author's recommendation. */
export function NextCard({
  sheet,
  section,
  onTab,
}: {
  sheet: Sheet;
  section: Section;
  onTab: (id: string) => void;
}) {
  const { chapter, state, links } = useWorksheet();
  const index = sheet.sections.indexOf(section);
  const next = sheet.sections[index + 1];
  const ready = sectionDone(sheet, section, state);
  if (next) {
    return (
      <nav className="weiter" aria-label={TEXT.next.label}>
        <button
          type="button"
          className="weiter__card weiter__card--next"
          disabled={!ready}
          onClick={() => onTab(next.id)}
        >
          <span className="weiter__label">{TEXT.next.label}</span>
          <span className="weiter__name">{next.title}</span>
          <ChevronRight className="icon" aria-hidden="true" />
        </button>
      </nav>
    );
  }
  const recommended = recommendation(sheet, chapter, state);
  const target =
    recommended.type === "sheet"
      ? chapter.sheets.find((s) => s.id === recommended.sheetId)
      : undefined;
  const open = openChallenges(chapter, state).length;
  return (
    <nav className="weiter" aria-label={TEXT.next.recommendation}>
      <Link
        className="weiter__card weiter__card--next"
        to={ready ? (target ? links.sheet(target.id) : links.challenges) : "#"}
        aria-disabled={!ready}
        tabIndex={ready ? undefined : -1}
        onClick={(event) => {
          if (!ready) {
            event.preventDefault();
          }
        }}
      >
        <span className="weiter__label">{TEXT.next.recommended}</span>
        <span className="weiter__name">
          {target ? target.title : TEXT.next.challenges}
        </span>
        {!target && (
          <span className="weiter__desc">
            {open
              ? plural(TEXT.next.openChallenges, open)
              : TEXT.next.noChallenges}
          </span>
        )}
        <ChevronRight className="icon" aria-hidden="true" />
      </Link>
    </nav>
  );
}
