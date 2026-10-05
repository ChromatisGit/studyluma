import { ChevronDown, Lock } from "lucide-react";
import { Button } from "@chromatis/base/ui";
import { Markdown } from "../../content";
import { fill } from "../../../helper/text";
import type { Challenge, Part } from "../domain/contract";
import {
  challengeOpen,
  isCheckable,
  isFoldedOptional,
  modeOf,
  structureLevel,
  type AufgabeInfo,
} from "../domain/structure";
import { HelpButton, HelpContent } from "./Help";
import { Mark } from "./Mark";
import { Solution } from "./Solution";
import { StepsPanel } from "./StepsPanel";
import { TaskView } from "./TaskView";
import { useWorksheet } from "./WorksheetContext";
import { refLabel, TEXT } from "./texts";

function PartView({
  part,
  info,
  multi,
  level,
}: {
  part: Part;
  info: AufgabeInfo;
  multi: boolean;
  level: number;
}) {
  const { response, ui } = useWorksheet();
  const result = response(part.id).lastCheck;
  const refText = refLabel(info);
  const withSteps = !!part.steps && level > 0;
  return (
    <div className="part" id={multi ? part.id : undefined}>
      <div className="part__main">
        {multi && <span className="part__letter">{part.letter})</span>}
        <div className="part__content">
          {withSteps ? (
            <>
              <div className="task">
                <Markdown
                  markdown={"prompt" in part.task ? part.task.prompt : ""}
                />
              </div>
              <StepsPanel part={part} level={level} refText={refText} />
              {level === 1 && (
                <TaskView
                  part={part}
                  refText={refText}

                  answerOnly
                />
              )}
            </>
          ) : (
            <TaskView part={part} refText={refText} />
          )}
          <HelpContent part={part} info={info} />
          {multi && (
            <div className="hilfen">
              <HelpButton part={part} info={info} />
            </div>
          )}
        </div>
      </div>
      <div className="mark-slot" aria-live="polite">
        {result && <Mark result={result} isNew={!!ui.newMarks[part.id]} />}
      </div>
    </div>
  );
}

/** One row per task: help on the left, "Gespeichert" and Prüfen on the right. */
function Foot({
  info,
  withCheck,
  help,
}: {
  info: AufgabeInfo;
  withCheck: boolean;
  help: Part | undefined;
}) {
  const { ui, checkAufgabe } = useWorksheet();
  const id = info.aufgabe.id;
  const hasText = info.aufgabe.parts.some(
    (part) => part.task.type === "auftrag" && part.task.textfeld,
  );
  if (!withCheck && !help && !hasText) {
    return null;
  }
  return (
    <div className="aufgabe__foot">
      <div className="aufgabe__foot-left">
        {help && <HelpButton part={help} info={info} />}
      </div>
      <div className="aufgabe__foot-right">
        {ui.emptyNote[id] && (
          <span className="aufgabe__note">{TEXT.check.emptyFirst}</span>
        )}
        <span
          className={`saved${ui.saved[id] ? " is-on" : ""}`}
          aria-live="polite"
        >
          {ui.saved[id] ? TEXT.aufgabe.saved : ""}
        </span>
        {withCheck && (
          <Button role="secondary" onClick={() => checkAufgabe(id)}>
            {TEXT.aufgabe.check}
          </Button>
        )}
      </div>
    </div>
  );
}

function AufgabeBody({ info }: { info: AufgabeInfo }) {
  const { state, ui } = useWorksheet();
  const { aufgabe } = info;
  const multi = aufgabe.parts.length > 1;
  const level = structureLevel(info, state, ui.help);
  // The row sits right after the last checkable part; an Auftrag after it isn't checked.
  const lastCheckable = aufgabe.parts.map(isCheckable).lastIndexOf(true);
  const at = lastCheckable >= 0 ? lastCheckable : aufgabe.parts.length - 1;
  return (
    <>
      {aufgabe.intro && (
        <div className="aufgabe__intro">
          <Markdown markdown={aufgabe.intro} />
        </div>
      )}
      {aufgabe.parts.map((part, i) => (
        <div key={part.id} className="part-wrap">
          <PartView part={part} info={info} multi={multi} level={level} />
          {i === at && (
            <Foot
              info={info}
              withCheck={lastCheckable >= 0}
              help={multi ? undefined : aufgabe.parts[0]}
            />
          )}
        </div>
      ))}
      <Solution aufgabe={aufgabe} />
    </>
  );
}

/** A challenge the student can't open yet: a dashed row with a lock. */
function LockedChallenge({ info }: { info: AufgabeInfo }) {
  const { chapter } = useWorksheet();
  const requires = (info.aufgabe as Challenge).requires
    .map((id) => chapter.sheets.find((sheet) => sheet.id === id))
    .map((sheet) =>
      fill(TEXT.aufgabe.lockedSheet, { number: sheet?.number ?? "?" }),
    )
    .join(TEXT.aufgabe.and);
  return (
    <article className="aufgabe aufgabe--locked" id={info.aufgabe.id}>
      <div className="aufgabe__num" aria-hidden="true">
        {info.aufgabe.number}
      </div>
      <div className="opt-box opt-box--locked">
        <div className="opt-box__head">
          <Lock className="icon icon--sm" aria-hidden="true" />
          <span className="opt-box__title">{info.aufgabe.title}</span>
          <span className="opt-box__tag">
            {fill(TEXT.aufgabe.lockedAfter, { sheets: requires })}
          </span>
        </div>
      </div>
    </article>
  );
}

/** An Aufgabe: number gutter, content, Korrekturrand. */
export function AufgabeView({ info }: { info: AufgabeInfo }) {
  const { chapter, state, ui, setUi, teacher } = useWorksheet();
  const { aufgabe } = info;
  if (
    info.challenge &&
    !teacher &&
    !challengeOpen(aufgabe as Challenge, chapter, state)
  ) {
    return <LockedChallenge info={info} />;
  }
  const titleId = `t-${aufgabe.id}`;
  const label = (
    <span className="visually-hidden">{`${refLabel(info)}: `}</span>
  );
  // Optional tasks in "Mehr Challenges": the same dashed head, closed or open.
  if (
    aufgabe.optional &&
    info.sheet &&
    modeOf(info.sheet, state) === "challenges"
  ) {
    const open = !isFoldedOptional(info, state, ui.optionalOpen);
    return (
      <article
        className={`aufgabe aufgabe--opt${open ? " is-open" : ""}`}
        id={aufgabe.id}
        aria-labelledby={titleId}
      >
        <div className="aufgabe__num" aria-hidden="true">
          {aufgabe.number}
        </div>
        <div className="opt-box">
          <button
            type="button"
            className="opt-box__head"
            aria-expanded={open}
            onClick={() =>
              setUi((current) => ({
                ...current,
                optionalOpen: { ...current.optionalOpen, [aufgabe.id]: !open },
              }))
            }
          >
            <span className="opt-box__num">{aufgabe.number}</span>
            <span className="opt-box__title" id={titleId}>
              {label}
              {aufgabe.title}
            </span>
            <span className="opt-box__tag">{TEXT.aufgabe.optional}</span>
            <ChevronDown className="icon icon--sm chev" aria-hidden="true" />
          </button>
          {open && (
            <div className="opt-box__body aufgabe__body">
              <AufgabeBody info={info} />
            </div>
          )}
        </div>
      </article>
    );
  }
  return (
    <article className="aufgabe" id={aufgabe.id} aria-labelledby={titleId}>
      <div className="aufgabe__num" aria-hidden="true">
        {aufgabe.number}
      </div>
      <div className="aufgabe__body">
        <header className="aufgabe__head">
          <h3 className="aufgabe__title" id={titleId}>
            <span className="aufgabe__inline-num">{aufgabe.number}</span>
            {label}
            {aufgabe.title}
          </h3>
        </header>
        <AufgabeBody info={info} />
      </div>
    </article>
  );
}
