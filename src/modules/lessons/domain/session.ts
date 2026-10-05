import { entryId, runningOrder } from "./layout";
import type { InkStroke, Lesson, LessonSession } from "./lesson";

export type SessionAction =
  | { type: "go"; frameId: string; now: number }
  | { type: "step"; by: 1 | -1; now: number }
  | { type: "addBlank"; now: number }
  | { type: "undo"; now: number }
  | { type: "stroke"; stroke: InkStroke }
  | { type: "erase"; strokeId: string }
  | { type: "toggleHidden" }
  | { type: "send"; frameId: string };

export function newSession(
  lesson: Lesson,
  openedAt: number,
  id: string,
): LessonSession {
  return {
    id,
    chapterId: lesson.chapterId,
    openedAt,
    currentFrameId: lesson.frames[0]?.id ?? "",
    enteredAt: 0,
    blanks: [],
    ink: [],
    hidden: false,
    sent: [],
  };
}

const enter = (
  session: LessonSession,
  frameId: string,
  now: number,
): LessonSession =>
  frameId === session.currentFrameId
    ? session
    : { ...session, currentFrameId: frameId, enteredAt: now };

/** What happens to a session; ink belongs to the session, never to the chapter. */
export function reduceSession(
  lesson: Lesson,
  session: LessonSession,
  action: SessionAction,
): LessonSession {
  const order = runningOrder(lesson, session.blanks);
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
        current?.kind === "blank" ? current.parent : current?.frame;
      if (!parent) {
        return session;
      }
      const id = `${parent.id}~${session.blanks.filter((b) => b.afterFrameId === parent.id).length + 1}`;
      const blanks = [...session.blanks, { id, afterFrameId: parent.id }];
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
    case "toggleHidden":
      return { ...session, hidden: !session.hidden };
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
