import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@chromatis/base/ui";
import { RichContent, RichInlineContent } from "../../content-renderer";
import type { Task, TaskPart } from "../../catalog";
import { solutionParts, tasksOf, type AufgabeInfo } from "../domain/structure";
import { useWorksheet } from "./WorksheetContext";
import type { CurrentView } from "./ChapterNav";
import { refLabel, TEXT } from "./texts";

const LETTERS = "ABCDEFGH";

function Prompt({ part }: { part: TaskPart }) {
  return (
    <>
      <RichContent
        nodes={part.content}
        renderGap={() => <span className="pult__gap" />}
      />
      {part.type === "Auswahl" && (
        <p className="pult__opts">
          {(part.options ?? []).map((option, i) => (
            <span key={i}>
              <b>{LETTERS[i]}</b> <RichInlineContent nodes={option.content} />
            </span>
          ))}
        </p>
      )}
    </>
  );
}

/** Arrow keys move between tasks, Escape closes. */
function usePultKeys(
  position: number | null,
  count: number,
  go: (next: number | null) => void,
) {
  useEffect(() => {
    if (position === null) {
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("input, textarea, select")) {
        return;
      }
      if (event.key === "ArrowRight") {
        go(Math.min(count - 1, position + 1));
      } else if (event.key === "ArrowLeft") {
        go(Math.max(0, position - 1));
      } else if (event.key === "Escape") {
        go(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
}

/** The task numbers, grouped by section. */
function PultNumbers({
  list,
  position,
  onGo,
}: {
  list: Task[];
  position: number;
  onGo: (at: number) => void;
}) {
  const { index } = useWorksheet();
  const groups = new Map<string, { aufgabe: Task; at: number }[]>();
  list.forEach((item, at) => {
    const group =
      index.aufgaben.get(item.id)?.section?.title ?? TEXT.pult.challenges;
    groups.set(group, [...(groups.get(group) ?? []), { aufgabe: item, at }]);
  });
  return (
    <nav className="pult__nums" aria-label={TEXT.pult.tasks}>
      {[...groups.entries()].map(([group, items]) => (
        <span key={group} className="pult__group">
          <span className="pult__grouplabel">{group}</span>
          {items.map((item) => {
            const itemInfo = index.aufgaben.get(item.aufgabe.id);
            return (
              <button
                key={item.aufgabe.id}
                type="button"
                className="pult__numbtn"
                aria-label={itemInfo ? refLabel(itemInfo) : undefined}
                aria-current={item.at === position ? "true" : undefined}
                onClick={() => onGo(item.at)}
              >
                {itemInfo?.number}
              </button>
            );
          })}
        </span>
      ))}
    </nav>
  );
}

/** One task for the desk: its text, then its Musterlösung. */
function PultTask({
  aufgabe,
  info,
}: {
  aufgabe: Task;
  info: AufgabeInfo | undefined;
}) {
  const multi = (info?.parts.length ?? 0) > 1;
  const solution = info ? solutionParts(info) : [];
  return (
    <div className="pult__main">
      <div className="pult__inner">
        <p className="pult__number">
          <span className="pult__ref">
            {info ? refLabel(info).replace(/\s*\d+$/, "") : ""}
          </span>
          {info?.number}
        </p>
        {aufgabe.title && <h2 className="pult__heading">{aufgabe.title}</h2>}
        <div className="pult__prompt">
          {aufgabe.items.map((item, i) =>
            item.type === "content" ? (
              <RichContent key={i} nodes={item.content} />
            ) : (
              <div key={item.part.id} className="pult__part">
                {multi && (
                  <span className="part__letter">
                    {
                      info?.parts.find((p) => p.part.id === item.part.id)
                        ?.letter
                    }
                    )
                  </span>
                )}
                <div>
                  <Prompt part={item.part} />
                </div>
              </div>
            ),
          )}
        </div>
        <div className="pult__sol">
          <p className="pult__label">{TEXT.pult.solution}</p>
          {solution.map(({ part, letter }) => (
            <div key={part.id} className="pult__part">
              {multi && letter && (
                <span className="part__letter">{letter})</span>
              )}
              <RichContent nodes={part.markers.loesung ?? []} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The teacher's desk view: one task with its Musterlösung, large. */
export function Pult({ current }: { current: CurrentView }) {
  const { chapter, index, ui, setUi } = useWorksheet();
  const sheet =
    current.kind === "sheet"
      ? chapter.sheets.find((s) => s.id === current.sheetId)
      : undefined;
  const list: Task[] = (
    sheet ? sheet.sections.flatMap(tasksOf) : chapter.challenges
  ).filter((aufgabe) => {
    const entry = index.aufgaben.get(aufgabe.id);
    return !!entry && solutionParts(entry).length > 0;
  });
  const position = ui.pult;
  const go = (next: number | null) =>
    setUi((state) => ({ ...state, pult: next }));

  usePultKeys(position, list.length, go);

  const aufgabe = position === null ? undefined : list[position];
  if (position === null || !aufgabe) {
    return null;
  }
  const info = index.aufgaben.get(aufgabe.id);
  return (
    <div
      className="pult"
      role="dialog"
      aria-modal="true"
      aria-label={TEXT.pult.label}
    >
      <div className="pult__bar">
        <p className="pult__title">
          {sheet ? sheet.title : TEXT.pult.challenges}
        </p>
        <PultNumbers list={list} position={position} onGo={go} />
        <Button role="ghost" size="sm" onClick={() => go(null)}>
          <X className="icon icon--sm" aria-hidden="true" />
          {TEXT.pult.close}
        </Button>
      </div>
      <PultTask aufgabe={aufgabe} info={info} />
      <div className="pult__nav">
        <Button
          role="secondary"
          disabled={position === 0}
          onClick={() => go(position - 1)}
        >
          <ChevronLeft className="icon" aria-hidden="true" />
          {TEXT.pult.previous}
        </Button>
        <Button
          role="secondary"
          disabled={position >= list.length - 1}
          onClick={() => go(position + 1)}
        >
          {TEXT.pult.next}
          <ChevronRight className="icon" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
