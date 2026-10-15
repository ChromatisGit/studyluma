import type { ClockStart } from "./clock";
import type { Deck } from "./deck";
import type { DeckState } from "./lesson";
import { newDeckState, reduceSession, type SessionAction } from "./session";

/**
 * A teaching unit: the lesson and its classroom as one thing. It belongs to
 * a course, starts with a main deck and keeps one state per deck it visited.
 * Visiting another deck (a detour) does not end it. The clock belongs to the
 * main deck and keeps running during a detour.
 */
export type Unit = {
  id: string;
  courseId: string;
  /** The deck the unit was started with; its `::bis` times are the plan. */
  mainPresentationId: string;
  /** The deck on the stage and the projector right now. */
  activePresentationId: string;
  openedAt: number;
  /** The lesson page of the main deck, and of the deck on the stage; "Zurück zur Präsentation" returns to the latter. */
  mainPath: string;
  resumePath: string;
  /** Chosen once at the start, changed only by the teacher's correction. */
  clock: ClockStart;
  /** The join code of the server session; null without a classroom. */
  sessionCode: string | null;
  decks: Record<string, DeckState>;
};

/** A deck is added to the unit when it first reaches the stage. */
export function startUnit(input: {
  id: string;
  courseId: string;
  presentationId: string;
  path: string;
  openedAt: number;
  clock: ClockStart;
  sessionCode: string | null;
}): Unit {
  const { presentationId, path, ...rest } = input;
  return {
    ...rest,
    mainPresentationId: presentationId,
    activePresentationId: presentationId,
    mainPath: path,
    resumePath: path,
    decks: {},
  };
}

/** The state of a deck; a deck not visited yet starts on its first slide. */
export function deckState(unit: Unit, deck: Deck): DeckState {
  return unit.decks[deck.id] ?? newDeckState(deck);
}

/** Whether the stage shows a deck other than the main one. */
export function inDetour(unit: Unit): boolean {
  return unit.activePresentationId !== unit.mainPresentationId;
}

/** Puts a deck on the stage, keeping the position it was left at. */
export function showDeck(unit: Unit, deck: Deck, path: string): Unit {
  if (
    unit.activePresentationId === deck.id &&
    unit.decks[deck.id] &&
    unit.resumePath === path
  ) {
    return unit;
  }
  return {
    ...unit,
    activePresentationId: deck.id,
    resumePath: path,
    decks: { ...unit.decks, [deck.id]: deckState(unit, deck) },
  };
}

/** What a teacher's action does to the deck on the stage. */
export function reduceUnit(
  unit: Unit,
  deck: Deck,
  action: SessionAction,
): Unit {
  const state = deckState(unit, deck);
  const next = reduceSession(deck, state, action);
  if (next === state && unit.decks[deck.id]) {
    return unit;
  }
  return { ...unit, decks: { ...unit.decks, [deck.id]: next } };
}

export function withClock(unit: Unit, clock: ClockStart): Unit {
  return { ...unit, clock };
}
