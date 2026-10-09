import { ChevronDown } from "lucide-react";
import { Link } from "react-router";
import {
  Merkkarte,
  MerkkarteBeispiel,
  RichContent,
} from "../../content-renderer";
import { fill } from "../../../helper/text";
import type { TaskPart } from "../../catalog";
import { helpLadder, tipOf, type AufgabeInfo } from "../domain/structure";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

const BUTTON: Record<string, string> = {
  tip: TEXT.help.tip,
  rule: TEXT.help.rule,
  example: TEXT.help.example,
  plan: TEXT.help.plan,
  rechenweg: TEXT.help.rechenweg,
};

/** One help button per task; each press shows the next step of the ladder. */
export function HelpButton({
  part,
  info,
}: {
  part: TaskPart;
  info: AufgabeInfo;
}) {
  const { chapter, state, ui, setUi } = useWorksheet();
  const ladder = helpLadder(part, info, state, chapter);
  const shown = ui.help[part.id] ?? 0;
  const next = ladder[shown];
  if (!next) {
    return null;
  }
  return (
    <button
      type="button"
      className="hilfe-btn"
      onClick={() =>
        setUi((current) => ({
          ...current,
          help: { ...current.help, [part.id]: shown + 1 },
        }))
      }
    >
      {BUTTON[next.kind]}
      {next.kind === "tip" && (
        <ChevronDown className="icon icon--sm chev" aria-hidden="true" />
      )}
    </button>
  );
}

/** What help has shown so far: the Tipp and the Merkkarte, step by step. */
export function HelpContent({
  part,
  info,
}: {
  part: TaskPart;
  info: AufgabeInfo;
}) {
  const { chapter, state, ui } = useWorksheet();
  const shown = helpLadder(part, info, state, chapter).slice(
    0,
    ui.help[part.id] ?? 0,
  );
  if (!shown.length) {
    return null;
  }
  const level = Math.max(0, ...shown.map((step) => step.merkkarte ?? 0));
  const tip = tipOf(part, chapter.cards);
  const card = tip?.card;
  return (
    <div className="tipp">
      {tip?.content.length ? (
        <div className="tipp__text">
          <span className="tipp__label">{TEXT.help.tipLabel}</span>
          <RichContent nodes={tip.content} />
        </div>
      ) : null}
      {card && level >= 1 && (
        <Merkkarte
          title={card.title}
          origin={fill(TEXT.help.merkkarteFrom, { origin: card.origin })}
          defaultExampleOpen={level >= 3}
          className="tipp__karte"
        >
          {level >= 2 && <RichContent nodes={card.rule} />}
          {level >= 3 &&
            card.examples.map((example, i) => (
              <MerkkarteBeispiel key={i}>
                <RichContent nodes={example} />
              </MerkkarteBeispiel>
            ))}
          {level >= 2 && (
            <Link className="link merkkarte__link" to={card.href}>
              {TEXT.help.toSummary}
            </Link>
          )}
        </Merkkarte>
      )}
    </div>
  );
}
