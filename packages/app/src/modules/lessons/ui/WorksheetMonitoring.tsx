import type { ReactNode } from "react";
import type { Worksheet } from "../../catalog";
import type { AmpelCause, SheetMonitoring } from "../../worksheets";
import { useSite, useTeacherMonitoring } from "../../classroom";
import { fill } from "../../../helper/text";
import { demoMonitoring } from "../infrastructure/demoMonitoring";
import TEXT from "./lessons.de.json";

const CAUSE_LABELS: Record<AmpelCause, string> = TEXT.monitoring.causesLabels;

/** `count` of `total` in percent, 0 for an empty class. */
function share(count: number, total: number): number {
  return total === 0 ? 0 : Math.min(100, (count / total) * 100);
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="lm__stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

/** One row per section: how much of the class is in it and how many are past it. */
function Progress({
  sheet,
  monitoring,
}: {
  sheet: Worksheet;
  monitoring: SheetMonitoring;
}) {
  const rows = [
    ...sheet.sections.map((section, i) => ({
      label: `${i + 1}. ${section.title}`,
      count: monitoring.sections[i] ?? 0,
    })),
    { label: TEXT.monitoring.done, count: monitoring.done },
    { label: TEXT.monitoring.challenges, count: monitoring.challenges },
  ];
  return (
    <section className="lm__panel">
      <h2 className="lm__heading">{TEXT.monitoring.progress}</h2>
      <ul className="lm__rows">
        {rows.map(({ label, count }) => (
          <li key={label} className="lm__row">
            <span className="lm__label">{label}</span>
            <span className="lm__bar">
              <span
                style={{ width: `${share(count, monitoring.registered)}%` }}
              />
            </span>
            <span className="lm__count">{count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The anonymous Ampel of the checkpoint and why students rated yellow or red. */
function Ampel({ ampel }: { ampel: SheetMonitoring["ampel"] }) {
  const open = ampel.total - ampel.answered;
  const causes = Object.entries(ampel.causes)
    .filter((entry): entry is [AmpelCause, number] => (entry[1] ?? 0) > 0)
    .sort((a, b) => b[1] - a[1]);
  return (
    <section className="lm__panel">
      <h2 className="lm__heading">{TEXT.monitoring.ampel}</h2>
      {ampel.answered ? (
        <>
          <p className="lm__note">
            {fill(TEXT.monitoring.ratedOf, {
              answered: ampel.answered,
              total: ampel.total,
            })}
          </p>
          <div
            className="lm__ampel"
            role="img"
            aria-label={fill(TEXT.monitoring.ampelAria, {
              green: ampel.levels.green,
              yellow: ampel.levels.yellow,
              red: ampel.levels.red,
              open,
            })}
          >
            {(["green", "yellow", "red"] as const).map((level) => (
              <span
                key={level}
                className={`lm__${level}`}
                style={{
                  width: `${share(ampel.levels[level], ampel.total)}%`,
                }}
              />
            ))}
            <span
              className="lm__open"
              style={{ width: `${share(open, ampel.total)}%` }}
            />
          </div>
          <h3 className="lm__sub">{TEXT.monitoring.causes}</h3>
          {causes.map(([cause, count]) => (
            <div className="lm__row" key={cause}>
              <span className="lm__label">{CAUSE_LABELS[cause]}</span>
              <span className="lm__bar">
                <span style={{ width: `${share(count, ampel.answered)}%` }} />
              </span>
              <span className="lm__count">{count}</span>
            </div>
          ))}
        </>
      ) : (
        <p className="lm__empty">{TEXT.monitoring.noFeedback}</p>
      )}
    </section>
  );
}

function Panels({
  sheet,
  monitoring,
}: {
  sheet: Worksheet;
  monitoring: SheetMonitoring;
}) {
  return (
    <>
      <div className="lm__stats">
        <Stat
          value={monitoring.registered}
          label={TEXT.monitoring.registered}
        />
        <Stat value={monitoring.working} label={TEXT.monitoring.working} />
        <Stat value={monitoring.done} label={TEXT.monitoring.done} />
      </div>
      <div className="lm__panels">
        <Progress sheet={sheet} monitoring={monitoring} />
        <Ampel ampel={monitoring.ampel} />
      </div>
    </>
  );
}

/** The session's figures: what the controller's snapshot knows. */
function SessionPanels({ sheet }: { sheet: Worksheet }) {
  const monitoring = useTeacherMonitoring(sheet.id, sheet.sections.length);
  return monitoring ? (
    <Panels sheet={sheet} monitoring={monitoring} />
  ) : (
    <p className="lm__empty">{TEXT.monitoring.noSession}</p>
  );
}

/** Scripted figures for an instance without sessions (the Demo). */
function DemoPanels({ sheet }: { sheet: Worksheet }) {
  return (
    <Panels sheet={sheet} monitoring={demoMonitoring(sheet.sections.length)} />
  );
}

/**
 * The teacher's view of how the class is doing on a worksheet, laid out on
 * the 1280 × 720 stage: the headline numbers, the sections, the Ampel.
 * Figures come from the running session; an instance without the classroom
 * shows scripted demo data, marked as such.
 */
export function WorksheetMonitoring({
  sheet,
  unlocked,
}: {
  sheet: Worksheet;
  unlocked: boolean;
}) {
  const { classroomEnabled } = useSite();
  return (
    <div className="lm">
      <header className="lm__head">
        <h1 className="lm__title">{sheet.title}</h1>
        {!classroomEnabled && (
          <span className="lm__demo">{TEXT.monitoring.demo}</span>
        )}
      </header>
      {!unlocked ? (
        <p className="lm__locked">{TEXT.monitoring.locked}</p>
      ) : classroomEnabled ? (
        <SessionPanels sheet={sheet} />
      ) : (
        <DemoPanels sheet={sheet} />
      )}
    </div>
  );
}
