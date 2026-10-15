import { Card, CardBody } from "@chromatis/base/ui";
import type { Worksheet } from "../../catalog";
import { sampleClassAmpel, type AmpelCause } from "../../worksheets";
import TEXT from "./lessons.de.json";

// Placeholder figure (with `sampleClassAmpel`) until worksheet monitoring has real data; it is not student activity.
const ONLINE = 22;
const CAUSE_LABELS: Record<AmpelCause, string> = TEXT.monitoring.causesLabels;

// eslint-disable-next-line max-lines-per-function
export function WorksheetMonitoring({
  sheet,
  unlocked,
}: {
  sheet: Worksheet;
  unlocked: boolean;
}) {
  const ampel = sampleClassAmpel(sheet.id);
  // Nobody is counted yet; the progress figures stay at zero until answers are.
  const causes = Object.entries(ampel.causes)
    .filter((entry): entry is [AmpelCause, number] => (entry[1] ?? 0) > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="lt-monitoring">
      <Card>
        <CardBody>
          <h2>
            {TEXT.monitoring.progress} <small>{TEXT.monitoring.demo}</small>
          </h2>
          {!unlocked ? (
            <p>{TEXT.monitoring.locked}</p>
          ) : (
            <>
              <p>
                {TEXT.monitoring.registered} {ONLINE} von {ampel.total}
              </p>
              <p>
                <strong>0</strong> {TEXT.monitoring.working}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>{TEXT.monitoring.section}</th>
                    <th>{TEXT.monitoring.share}</th>
                    <th title={TEXT.monitoring.hereTitle}>
                      {TEXT.monitoring.here}
                    </th>
                    <th title={TEXT.monitoring.beyondTitle}>
                      {TEXT.monitoring.beyond}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.sections.map((section, index) => {
                    return (
                      <ProgressRow
                        key={section.id}
                        label={`${index + 1}. ${section.title}`}
                        count={0}
                        beyond={0}
                        total={0}
                      />
                    );
                  })}
                  <ProgressRow
                    label={TEXT.monitoring.done}
                    count={0}
                    total={0}
                  />
                  <ProgressRow
                    label={TEXT.monitoring.challenges}
                    count={0}
                    total={0}
                  />
                </tbody>
              </table>
            </>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h2>
            {TEXT.monitoring.ampel}{" "}
            <small>{TEXT.monitoring.anonymousDemo}</small>
          </h2>
          {ampel.answered ? (
            <>
              <p>
                {ampel.answered} von {ampel.total} {TEXT.monitoring.rated}
              </p>
              <div
                className="lt-monitoring__ampel"
                aria-label={TEXT.monitoring.ampelAria
                  .replace("{green}", String(ampel.levels.green))
                  .replace("{yellow}", String(ampel.levels.yellow))
                  .replace("{red}", String(ampel.levels.red))
                  .replace("{open}", String(ampel.total - ampel.answered))}
              >
                {(["green", "yellow", "red"] as const).map((level) => (
                  <span
                    key={level}
                    className={`lt-monitoring__${level}`}
                    style={{
                      width: `${(ampel.levels[level] / ampel.total) * 100}%`,
                    }}
                  />
                ))}
                <span
                  className="lt-monitoring__open"
                  style={{
                    width: `${((ampel.total - ampel.answered) / ampel.total) * 100}%`,
                  }}
                />
              </div>
              <p>
                {TEXT.monitoring.green} {ampel.levels.green} ·{" "}
                {TEXT.monitoring.yellow} {ampel.levels.yellow} ·{" "}
                {TEXT.monitoring.red} {ampel.levels.red} ·{" "}
                {TEXT.monitoring.open} {ampel.total - ampel.answered}
              </p>
              <h3>{TEXT.monitoring.causes}</h3>
              {causes.map(([cause, count]) => (
                <div className="lt-monitoring__cause" key={cause}>
                  <span>{CAUSE_LABELS[cause]}</span>
                  <meter min="0" max={ampel.answered} value={count} />
                  <strong>{count}</strong>
                </div>
              ))}
            </>
          ) : (
            <p>{TEXT.monitoring.noFeedback}</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function ProgressRow({
  label,
  count,
  beyond,
  total,
}: {
  label: string;
  count: number;
  beyond?: number;
  total: number;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>
        <div className="lt-monitoring__bar">
          <span style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
        </div>
      </td>
      <td>{count}</td>
      <td>{beyond ?? ""}</td>
    </tr>
  );
}
