import type { JsonValue } from "../../catalog";
import type { GraphicChanges, OwnFunction } from "../../content-renderer";
import { entryId, runningOrder, type OrderEntry } from "./layout";
import type { Deck } from "./deck";
import type { Blank, InkStroke, DeckState } from "./lesson";

export type SessionAction =
  | { type: "go"; frameId: string; now: number }
  | { type: "step"; by: 1 | -1; now: number }
  | { type: "addBlank"; now: number; task?: Blank["task"] }
  | { type: "toggleSheet"; frameId: string }
  | { type: "undo"; now: number }
  | { type: "clear" }
  | { type: "stroke"; stroke: InkStroke }
  | { type: "erase"; strokeId: string }
  | { type: "toggleHidden" }
  | { type: "toggleFreeze" }
  | { type: "send"; frameId: string }
  | { type: "graphic"; slideId: string; change: GraphicChange }
  /** The new state of a Komponentenfolie, as its view set it. */
  | { type: "component"; slideId: string; state: JsonValue };

/**
 * One move on a Grafikfolie: a slider, an authored curve shown or hidden, or
 * a function typed in during the lesson. `own` at the end of the list adds
 * one, null removes it.
 */
export type GraphicChange =
  | { kind: "value"; name: string; value: number }
  | { kind: "visible"; index: number; visible: boolean }
  | { kind: "own"; index: number; own: OwnFunction | null };

function changeGraphic(
  current: GraphicChanges,
  change: GraphicChange,
): GraphicChanges {
  switch (change.kind) {
    case "value":
      return {
        ...current,
        values: { ...current.values, [change.name]: change.value },
      };
    case "visible":
      return {
        ...current,
        visible: { ...current.visible, [change.index]: change.visible },
      };
    case "own": {
      const own = [...(current.own ?? [])];
      if (change.own) {
        own[Math.min(change.index, own.length)] = change.own;
      } else {
        own.splice(change.index, 1);
      }
      return { ...current, own };
    }
  }
}

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

const ownInk = (session: DeckState) =>
  session.ink.filter((stroke) => stroke.frameId === session.currentFrameId);

/** Takes back the last stroke, then wiped ink, then an empty blank. */
function undoInk(
  session: DeckState,
  current: OrderEntry | undefined,
  now: number,
): DeckState {
  const last = ownInk(session).at(-1);
  if (last) {
    return { ...session, ink: session.ink.filter((stroke) => stroke !== last) };
  }
  const cleared = session.cleared ?? [];
  const wiped = cleared
    .filter((entry) => entry.frameId === session.currentFrameId)
    .at(-1);
  if (wiped) {
    return {
      ...session,
      ink: [...session.ink, ...wiped.strokes],
      cleared: cleared.filter((entry) => entry !== wiped),
    };
  }
  // Undo on an empty blank takes the blank back and returns to its frame.
  if (current?.kind === "blank") {
    return {
      ...session,
      blanks: session.blanks.filter((blank) => blank.id !== current.blank.id),
      currentFrameId: current.parent.id,
      enteredAt: now,
    };
  }
  return session;
}

/** Wipes the ink of the current frame; undo brings it back. */
function clearInk(session: DeckState): DeckState {
  const own = ownInk(session);
  return own.length
    ? {
        ...session,
        ink: session.ink.filter((stroke) => !own.includes(stroke)),
        cleared: [
          ...(session.cleared ?? []),
          { frameId: session.currentFrameId, strokes: own },
        ],
      }
    : session;
}

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
    case "undo":
      return undoInk(session, current, action.now);
    case "clear":
      return clearInk(session);
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
              graphics: structuredClone(session.graphics ?? {}),
              components: structuredClone(session.components ?? {}),
            },
          };
    case "graphic": {
      const changed = changeGraphic(
        session.graphics?.[action.slideId] ?? {},
        action.change,
      );
      return {
        ...session,
        graphics: { ...session.graphics, [action.slideId]: changed },
      };
    }
    case "component":
      return {
        ...session,
        components: { ...session.components, [action.slideId]: action.state },
      };
    case "send":
      return session.sent.includes(action.frameId)
        ? session
        : { ...session, sent: [...session.sent, action.frameId] };
  }
}

/** Distance from a point to the segment between two stroke points. */
function distanceToSegment(
  [px, py]: [number, number],
  [ax, ay]: [number, number],
  [bx, by]: [number, number],
): number {
  const length = (bx - ax) ** 2 + (by - ay) ** 2;
  const along = length
    ? Math.max(
        0,
        Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / length),
      )
    : 0;
  return Math.hypot(
    px - (ax + along * (bx - ax)),
    py - (ay + along * (by - ay)),
  );
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
        (point, i) =>
          distanceToSegment([x, y], stroke.points[i - 1] ?? point, point) <=
          radius,
      ),
    );
}
