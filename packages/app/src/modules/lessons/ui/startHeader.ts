import { fill } from "../../../helper/text";
import { startChoices, type Period } from "../domain/clock";
import type { Deck } from "../domain/deck";
import { entryId, entrySlide, runningOrder } from "../domain/layout";
import { deckState, type Unit } from "../domain/unit";
import type { StartChoice } from "./LessonHeader";
import TEXT from "./lessons.de.json";

const clockTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const timeOf = (epoch: number) => {
  const date = new Date(epoch);
  return clockTime(date.getHours() * 60 + date.getMinutes());
};

/** "3. Stunde · ab 09:50" and the corrections to offer; no label without a timetable. */
export function startHeader(
  unit: Unit,
  periods: Period[],
  onChoose: (period: Period | null) => void,
): { startLabel: string | null; choices: StartChoice[] } {
  const choices = startChoices(periods, unit.clock.periodNumber).map(
    (period) => ({
      key: String(period?.number ?? "now"),
      label: period
        ? fill(TEXT.header.choosePeriod, {
            number: period.number,
            time: clockTime(period.start),
          })
        : TEXT.header.chooseNow,
      selected: (period?.number ?? null) === unit.clock.periodNumber,
      onChoose: () => onChoose(period),
    }),
  );
  const time = timeOf(unit.clock.startsAt);
  const startLabel = !periods.length
    ? null
    : unit.clock.periodNumber === null
      ? fill(TEXT.header.startNow, { time })
      : fill(TEXT.header.startPeriod, {
          number: unit.clock.periodNumber,
          time,
        });
  return { startLabel, choices };
}

/**
 * The plan and the clock belong to the main deck, also during a detour:
 * where the main deck stands, and whether the stage is elsewhere.
 */
export function planOf(unit: Unit, deck: Deck, mainDeck: Deck) {
  const planDeck = mainDeck.id === unit.mainPresentationId ? mainDeck : deck;
  const state = deckState(unit, planDeck);
  const entry = runningOrder(planDeck, state.blanks).find(
    (item) => entryId(item) === state.currentFrameId,
  );
  return {
    planDeck,
    planState: state,
    planSlide: entry ? entrySlide(entry) : planDeck.slides[0],
    detour: unit.mainPresentationId !== deck.id && planDeck !== deck,
  };
}
