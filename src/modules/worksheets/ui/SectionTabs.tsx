import { useRef, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import type { Worksheet as Sheet } from "../../catalog";
import { sectionDone } from "../domain/structure";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

/** The sections of a sheet as tabs, in a bar that stays in view. */
export function SectionTabs({
  sheet,
  current,
  onSelect,
}: {
  sheet: Sheet;
  current: string;
  onSelect: (id: string) => void;
}) {
  const { state } = useWorksheet();
  const list = useRef<HTMLDivElement>(null);
  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const count = sheet.sections.length;
    const target =
      event.key === "ArrowRight"
        ? (index + 1) % count
        : event.key === "ArrowLeft"
          ? (index - 1 + count) % count
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : -1;
    const section = sheet.sections[target];
    if (section) {
      event.preventDefault();
      onSelect(section.id);
      const tabs =
        list.current?.querySelectorAll<HTMLButtonElement>("[role=tab]");
      tabs?.item(target)?.focus();
    }
  };
  return (
    <div className="tabbar">
      <div className="tabbar__inner">
        <div className="tabs ws-tabs">
          <div
            className="tabs__list"
            role="tablist"
            aria-label={TEXT.sheet.sections}
            ref={list}
          >
            {sheet.sections.map((section, index) => {
              const selected = section.id === current;
              const done = sectionDone(sheet, section, state);
              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  className="tabs__tab ws-tab"
                  id={`tab-${section.id}`}
                  aria-controls="page-panel"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onSelect(section.id)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                >
                  {section.title}
                  {done && (
                    <span className="ws-tab__done" title={TEXT.sheet.doneTitle}>
                      <Check className="icon" aria-hidden="true" />
                      <span className="visually-hidden">{`, ${TEXT.sheet.done}`}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
