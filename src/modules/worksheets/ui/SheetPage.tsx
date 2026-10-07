import { useEffect } from "react";
import { Check } from "lucide-react";
import { fill } from "../../../helper/text";
import type { Section, Sheet } from "../domain/contract";
import { fixedMode, isUnlocked, modeOf } from "../domain/structure";
import { Ampel } from "./Ampel";
import { AufgabeView } from "./AufgabeView";
import { ModeChoice, ModeLine } from "./ModeChoice";
import { NextCard } from "./NextCard";
import { SectionTabs } from "./SectionTabs";
import { SheetHeader } from "./SheetHeader";
import { ReleasedNotice } from "./ReleasedNotice";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

function SectionView({ sheet, section }: { sheet: Sheet; section: Section }) {
  const { index } = useWorksheet();
  const checkpoint = section.kind === "checkpoint";
  return (
    <section
      className={`ws-section${checkpoint ? " check" : ""}`}
      aria-labelledby={`tab-${section.id}`}
    >
      {checkpoint && (
        <header className="check__head">
          <p className="check__kicker">
            <Check className="icon" aria-hidden="true" />
            {TEXT.checkpoint.kicker}
          </p>
          <h2 className="check__title">{TEXT.checkpoint.title}</h2>
          <p className="check__lead">{TEXT.checkpoint.lead}</p>
        </header>
      )}
      {section.intro && (
        <div className="ws-section__intro">{section.intro}</div>
      )}
      {section.aufgaben.map((aufgabe) => {
        const info = index.aufgaben.get(aufgabe.id);
        return info ? <AufgabeView key={aufgabe.id} info={info} /> : null;
      })}
      {checkpoint && <Ampel sheet={sheet} />}
    </section>
  );
}

/** A worksheet: head, tabs per section, tasks, checkpoint, recommendation. */
export function SheetPage({ sheet }: { sheet: Sheet }) {
  const { chapter, state, store, teacher, ui, deactivate } = useWorksheet();
  const unlocked = isUnlocked(sheet, state);

  useEffect(() => {
    if (unlocked && !teacher) {
      store.markSeen(sheet.id);
    }
  }, [sheet.id, unlocked, teacher, store]);

  const meta = fill(TEXT.sheet.meta, {
    chapter: chapter.number,
    number: sheet.number,
  });
  if (!unlocked && !teacher) {
    return null;
  }
  const picking =
    (!modeOf(sheet, state) && !teacher && !fixedMode(sheet)) ||
    !!ui.pickMode[sheet.id];
  const section =
    sheet.sections.find((s) => s.id === state.tabs[sheet.id]) ??
    sheet.sections[0];
  const selectTab = (id: string) => {
    deactivate();
    store.setTab(sheet.id, id);
    window.scrollTo({ top: 0 });
  };
  const aufgaben = sheet.sections.flatMap((s) => s.aufgaben);
  return (
    <>
      <SheetHeader
        meta={meta}
        title={sheet.title}
        lead={sheet.intro}
        modeLine={picking ? null : <ModeLine sheet={sheet} />}
      />
      {!picking && section && (
        <SectionTabs sheet={sheet} current={section.id} onSelect={selectTab} />
      )}
      <div
        id="page-panel"
        role={picking ? undefined : "tabpanel"}
        aria-labelledby={picking || !section ? undefined : `tab-${section.id}`}
      >
        <div className="ws">
          {!teacher && <ReleasedNotice aufgaben={aufgaben} />}
          {picking ? (
            <ModeChoice sheet={sheet} />
          ) : (
            section && (
              <>
                <SectionView sheet={sheet} section={section} />
                <NextCard sheet={sheet} section={section} onTab={selectTab} />
              </>
            )
          )}
        </div>
      </div>
    </>
  );
}
