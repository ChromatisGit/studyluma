import { Card, CardBody } from "@chromatis/base/ui";
import type { Worksheet } from "../../catalog";
import { sampleClassAmpel, type AmpelCause } from "../../worksheets";

// Anonymous fixture totals for the classroom demo. They are not student activity.
const PROGRESS: Record<
  string,
  { sections: number[]; done: number; challenges: number }
> = {
  potenzregel: { sections: [2, 4], done: 10, challenges: 3 },
  faktorregel: { sections: [3, 5], done: 5, challenges: 2 },
  vermischt: { sections: [2, 4, 3], done: 4, challenges: 1 },
};
const ONLINE = 22;
const CAUSE_LABELS: Record<AmpelCause, string> = {
  topic: "Thema noch unklar",
  task: "Aufgabenstellung unklar",
  approach: "Weiß nicht, wie anfangen",
  execution: "Muss noch mehr üben",
  mistake: "Fehler nicht verstanden",
  other: "Anderes",
};

// The two cards stay together so both read the same fixture snapshot.
// eslint-disable-next-line max-lines-per-function
export function WorksheetMonitoring({
  sheet,
  unlocked,
}: {
  sheet: Worksheet;
  unlocked: boolean;
}) {
  const progress = PROGRESS[sheet.id];
  const ampel = sampleClassAmpel(sheet.id);
  const onSheet = progress
    ? progress.sections.reduce((total, count) => total + count, progress.done)
    : 0;
  const causes = Object.entries(ampel.causes)
    .filter((entry): entry is [AmpelCause, number] => (entry[1] ?? 0) > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="lt-monitoring">
      <Card>
        <CardBody>
          <h2>
            Fortschritt <small>Demodaten</small>
          </h2>
          {!unlocked && !onSheet ? (
            <p>
              Das Blatt ist noch gesperrt. Sobald du es freischaltest, siehst du
              hier, wo die Klasse arbeitet.
            </p>
          ) : (
            <>
              <p>
                angemeldet: {ONLINE} von {ampel.total}
              </p>
              <p>
                <strong>{onSheet}</strong>{" "}
                {onSheet === 1 ? "arbeitet" : "arbeiten"} gerade an diesem Blatt
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Abschnitt</th>
                    <th>Anteil</th>
                    <th title="Gerade in diesem Abschnitt">Hier</th>
                    <th title="Schon über diesen Abschnitt hinaus">Weiter</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.sections.map((section, index) => {
                    const here = progress?.sections[index] ?? 0;
                    const beyond =
                      (progress?.sections
                        .slice(index + 1)
                        .reduce((sum, count) => sum + count, 0) ?? 0) +
                      (progress?.done ?? 0);
                    return (
                      <ProgressRow
                        key={section.id}
                        label={`${index + 1}. ${section.title}`}
                        count={here}
                        beyond={beyond}
                        total={onSheet}
                      />
                    );
                  })}
                  <ProgressRow
                    label="Fertig"
                    count={progress?.done ?? 0}
                    total={onSheet}
                  />
                  <ProgressRow
                    label="Challenges"
                    count={progress?.challenges ?? 0}
                    total={onSheet}
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
            CfU-Ampel <small>anonym · Demodaten</small>
          </h2>
          {ampel.answered ? (
            <>
              <p>
                {ampel.answered} von {ampel.total} haben bewertet
              </p>
              <div
                className="lt-monitoring__ampel"
                aria-label={`${ampel.levels.green} grün, ${ampel.levels.yellow} gelb, ${ampel.levels.red} rot, ${ampel.total - ampel.answered} offen`}
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
                Grün {ampel.levels.green} · Gelb {ampel.levels.yellow} · Rot{" "}
                {ampel.levels.red} · Offen {ampel.total - ampel.answered}
              </p>
              <h3>Gründe bei Gelb und Rot</h3>
              {causes.map(([cause, count]) => (
                <div className="lt-monitoring__cause" key={cause}>
                  <span>{CAUSE_LABELS[cause]}</span>
                  <meter min="0" max={ampel.answered} value={count} />
                  <strong>{count}</strong>
                </div>
              ))}
            </>
          ) : (
            <p>
              Noch keine Rückmeldungen. Die Ampel füllt sich, sobald
              Schüler:innen den Checkpoint erreichen.
            </p>
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
