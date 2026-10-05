import { Button, Choice, ChoiceGroup } from "@chromatis/base/ui";
import type { AmpelCause, AmpelLevel, Sheet } from "../domain/contract";
import { checkpointChecked } from "../domain/structure";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

const LEVELS: AmpelLevel[] = ["green", "yellow", "red"];
const CAUSES = Object.keys(TEXT.ampel.causes) as AmpelCause[];

/** The answered Ampel with "ändern". */
function AmpelDone({ sheet }: { sheet: Sheet }) {
  const { state, setUi } = useWorksheet();
  const done = state.ampels[sheet.id];
  if (!done) {
    return null;
  }
  return (
    <div className="ampel ampel--done" data-level={done.level}>
      <span className="ampel__dot" aria-hidden="true" />
      <span>{TEXT.ampel.levels[done.level]}</span>
      <button
        type="button"
        className="link-btn"
        onClick={() =>
          setUi((current) => ({
            ...current,
            ampelEdit: { ...current.ampelEdit, [sheet.id]: true },
            ampelDraft: {
              ...current.ampelDraft,
              [sheet.id]: {
                level: done.level,
                causes: [...(done.causes ?? [])],
              },
            },
          }))
        }
      >
        {TEXT.ampel.change}
      </button>
    </div>
  );
}

/**
 * The Ampel after the checkpoint: anonymous, the teacher only sees class
 * totals. Yellow and red ask for at least one cause.
 */
export function Ampel({ sheet }: { sheet: Sheet }) {
  const { state, store, ui, setUi } = useWorksheet();
  if (!checkpointChecked(sheet, state)) {
    return (
      <div className="ampel ampel--waiting">
        <p className="ampel__wait">{TEXT.ampel.wait}</p>
      </div>
    );
  }
  const done = state.ampels[sheet.id];
  if (done && !ui.ampelEdit[sheet.id]) {
    return <AmpelDone sheet={sheet} />;
  }
  const draft = ui.ampelDraft[sheet.id] ?? { level: null, causes: [] };
  const causes = (draft.causes ?? []) as AmpelCause[];
  const needsCause = draft.level === "yellow" || draft.level === "red";
  const canSubmit = !!draft.level && (!needsCause || causes.length > 0);
  const setDraft = (level: AmpelLevel | null, nextCauses: AmpelCause[]) =>
    setUi((current) => ({
      ...current,
      ampelDraft: {
        ...current.ampelDraft,
        [sheet.id]: level
          ? { level, causes: nextCauses }
          : { level: null, causes: [] },
      },
    }));
  return (
    <div className="ampel">
      <fieldset className="ampel__levels">
        <legend className="ampel__q">{TEXT.ampel.question}</legend>
        {LEVELS.map((level) => (
          <label key={level} className="choice ampel__level" data-level={level}>
            <input
              className="ampel__radio"
              type="radio"
              name={`ampel-${sheet.id}`}
              checked={draft.level === level}
              onChange={() => setDraft(level, level === "green" ? [] : causes)}
            />
            <span className="choice__text">{TEXT.ampel.levels[level]}</span>
          </label>
        ))}
      </fieldset>
      {needsCause && (
        <ChoiceGroup
          legend={<span className="ampel__q">{TEXT.ampel.causeQuestion}</span>}
          className="ampel__causes"
        >
          {CAUSES.map((cause) => (
            <Choice
              key={cause}
              type="checkbox"
              label={TEXT.ampel.causes[cause]}
              checked={causes.includes(cause)}
              onChange={(event) =>
                setDraft(
                  draft.level,
                  event.target.checked
                    ? [...causes, cause]
                    : causes.filter((other) => other !== cause),
                )
              }
            />
          ))}
        </ChoiceGroup>
      )}
      <Button
        className="ampel__submit"
        disabled={!canSubmit}
        onClick={() => {
          if (!draft.level) {
            return;
          }
          store.setAmpel(
            sheet.id,
            draft.level === "green"
              ? { level: "green" }
              : { level: draft.level, causes },
          );
          setUi((current) => ({
            ...current,
            ampelEdit: { ...current.ampelEdit, [sheet.id]: false },
          }));
        }}
      >
        {TEXT.ampel.submitButton}
      </Button>
    </div>
  );
}
