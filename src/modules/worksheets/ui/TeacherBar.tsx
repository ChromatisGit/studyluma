import { Lock, LockOpen, Presentation } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@chromatis/base/ui";
import { fill } from "../../../helper/text";
import type { AmpelCause, Aufgabe, Sheet } from "../domain/contract";
import { isReleased } from "../domain/structure";
import { sampleClassAmpel } from "../infrastructure/localChapterStore";
import { useWorksheet } from "./WorksheetContext";
import { refLabel, TEXT } from "./texts";

/** The class's Ampel for a sheet: anonymous totals only. */
function ClassAmpel({ sheet }: { sheet: Sheet }) {
  const totals = sampleClassAmpel(sheet.id);
  const open = totals.total - totals.answered;
  const top = (Object.entries(totals.causes) as [AmpelCause, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([cause, count]) => `${TEXT.teacher.causes[cause]} (${count})`);
  const segments: [string, number][] = [
    ["green", totals.levels.green],
    ["yellow", totals.levels.yellow],
    ["red", totals.levels.red],
  ];
  return (
    <div className="klasse">
      <p className="klasse__title">
        {TEXT.teacher.classAmpel}{" "}
        <span className="klasse__demo">{TEXT.teacher.sample}</span>
      </p>
      <p className="klasse__bar">
        {segments.map(([level, count]) =>
          count ? (
            <span
              key={level}
              className="klasse__seg"
              data-level={level}
              style={{ flex: count }}
            >
              {count}
            </span>
          ) : null,
        )}
        {open > 0 && (
          <span
            className="klasse__seg klasse__seg--open"
            style={{ flex: open }}
          >
            {TEXT.teacher.open}
          </span>
        )}
      </p>
      <p className="klasse__meta">
        {fill(TEXT.teacher.answered, {
          answered: totals.answered,
          total: totals.total,
        })}{" "}
        {top.length > 0 &&
          fill(TEXT.teacher.topCauses, { causes: top.join(", ") })}
      </p>
    </div>
  );
}

/** Teacher tools above a sheet: release all solutions, Pult, class Ampel. */
export function TeacherBar({
  sheet,
  aufgaben,
}: {
  sheet?: Sheet | undefined;
  aufgaben: Aufgabe[];
}) {
  const { state, store, setUi } = useWorksheet();
  const withSolution = aufgaben.filter((aufgabe) => aufgabe.solution);
  const all =
    withSolution.length > 0 &&
    withSolution.every((aufgabe) => isReleased(aufgabe, state));
  return (
    <>
      <div className="lehrkraft">
        <p className="lehrkraft__text">
          <strong>{TEXT.teacher.lead}</strong> {TEXT.teacher.text}
        </p>
        <div className="lehrkraft__actions">
          <Button
            role="secondary"
            size="sm"
            onClick={() =>
              store.setReleased(
                withSolution.map((aufgabe) => aufgabe.id),
                !all,
              )
            }
          >
            {all ? (
              <Lock className="icon icon--sm" aria-hidden="true" />
            ) : (
              <LockOpen className="icon icon--sm" aria-hidden="true" />
            )}
            {all ? TEXT.teacher.lockAll : TEXT.teacher.releaseAll}
          </Button>
          <Button
            role="secondary"
            size="sm"
            onClick={() => setUi((current) => ({ ...current, pult: 0 }))}
          >
            <Presentation className="icon icon--sm" aria-hidden="true" />
            {TEXT.teacher.pult}
          </Button>
        </div>
      </div>
      {sheet && <ClassAmpel sheet={sheet} />}
    </>
  );
}

/** For students: which solutions the teacher released on this page. */
export function ReleasedNotice({ aufgaben }: { aufgaben: Aufgabe[] }) {
  const { state, index, setUi } = useWorksheet();
  const released = aufgaben.filter((aufgabe) => isReleased(aufgabe, state));
  if (!released.length) {
    return null;
  }
  return (
    <p className="freigabe">
      <LockOpen className="icon" aria-hidden="true" />
      <span>
        {TEXT.released.text}{" "}
        {released.map((aufgabe, i) => {
          const info = index.aufgaben.get(aufgabe.id);
          return (
            <span key={aufgabe.id}>
              {i > 0 && ", "}
              <Link
                className="link"
                to={`#${aufgabe.id}`}
                onClick={() =>
                  setUi((current) => ({
                    ...current,
                    solutionOpen: {
                      ...current.solutionOpen,
                      [aufgabe.id]: true,
                    },
                  }))
                }
              >
                {info ? refLabel(info) : aufgabe.title}
              </Link>
            </span>
          );
        })}
      </span>
    </p>
  );
}
