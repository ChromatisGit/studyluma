import { entryId, runningOrder } from "./layout";
import type { Deck } from "./deck";
import type { Blank, InkStroke, DeckState } from "./lesson";

export type SessionAction =
  | { type: "go"; frameId: string; now: number }
  | { type: "step"; by: 1 | -1; now: number }
  | { type: "addBlank"; now: number; task?: Blank["task"] }
  | { type: "toggleSheet"; frameId: string }
  | { type: "undo"; now: number }
  | { type: "stroke"; stroke: InkStroke }
  | { type: "erase"; strokeId: string }
  | { type: "toggleHidden" }
  | { type: "toggleFreeze" }
  | { type: "send"; frameId: string };

export function newDeckState(deck: Deck): DeckState {
  return {
    currentFrameId: deck.slides[0]?.id ?? "",
    enteredAt: 0,
    blanks: [],
    ink: [],
    hidden: false,
    sent: [],
  };
}

const enter = (session: DeckState, frameId: string, now: number): DeckState =>
  frameId === session.currentFrameId
    ? session
    : { ...session, currentFrameId: frameId, enteredAt: now };

/** What happens to a deck in the lesson; ink belongs to the lesson, never to the chapter. */
export function reduceSession(
  deck: Deck,
  session: DeckState,
  action: SessionAction,
): DeckState {
  const order = runningOrder(deck, session.blanks);
  const index = order.findIndex(
    (entry) => entryId(entry) === session.currentFrameId,
  );
  const current = order[index];
  switch (action.type) {
    case "go":
      return order.some((entry) => entryId(entry) === action.frameId)
        ? enter(session, action.frameId, action.now)
        : session;
    case "step": {
      const target = order[index + action.by];
      return target ? enter(session, entryId(target), action.now) : session;
    }
    case "addBlank": {
      // A blank hangs after the frame it branches from; from a blank, after its parent.
      const parent =
        current?.kind === "blank" ? current.parent : current?.slide;
      if (!parent) {
        return session;
      }
      const id = `${parent.id}~${session.blanks.filter((b) => b.afterFrameId === parent.id).length + 1}`;
      const blanks = [
        ...session.blanks,
        {
          id,
          afterFrameId: parent.id,
          ...(action.task ? { task: action.task } : {}),
        },
      ];
      return { ...session, blanks, currentFrameId: id, enteredAt: action.now };
    }
    case "undo": {
      const own = session.ink.filter(
        (stroke) => stroke.frameId === session.currentFrameId,
      );
      // Undo on an empty blank takes the blank back and returns to its frame.
      if (!own.length && current?.kind === "blank") {
        return {
          ...session,
          blanks: session.blanks.filter(
            (blank) => blank.id !== current.blank.id,
          ),
          currentFrameId: current.parent.id,
          enteredAt: action.now,
        };
      }
      const last = own.at(-1);
      return last
        ? { ...session, ink: session.ink.filter((stroke) => stroke !== last) }
        : session;
    }
    case "stroke":
      return { ...session, ink: [...session.ink, action.stroke] };
    case "erase":
      return {
        ...session,
        ink: session.ink.filter((stroke) => stroke.id !== action.strokeId),
      };
    case "toggleSheet":
      return {
        ...session,
        sheetShown:
          session.sheetShown === action.frameId ? null : action.frameId,
      };
    case "toggleHidden":
      return { ...session, hidden: !session.hidden };
    case "toggleFreeze":
      return session.frozen
        ? { ...session, frozen: null }
        : {
            ...session,
            frozen: {
              currentFrameId: session.currentFrameId,
              blanks: structuredClone(session.blanks),
              ink: structuredClone(session.ink),
              sent: [...session.sent],
              hidden: session.hidden,
              sheetShown: session.sheetShown ?? null,
            },
          };
    case "send":
      return session.sent.includes(action.frameId)
        ? session
        : { ...session, sent: [...session.sent, action.frameId] };
  }
}

/** The stroke under a point: whole strokes are erased, not pixels. */
export function strokeAt(
  strokes: InkStroke[],
  x: number,
  y: number,
  radius = 14,
): InkStroke | undefined {
  return [...strokes]
    .reverse()
    .find((stroke) =>
      stroke.points.some(
        ([px, py]) => (px - x) ** 2 + (py - y) ** 2 <= radius ** 2,
      ),
    );
}
