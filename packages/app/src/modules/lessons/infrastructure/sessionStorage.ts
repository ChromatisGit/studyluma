import type { LessonSession } from "../domain/lesson";

const KEY = (presentationId: string) => `studyluma:lesson:${presentationId}`;

type Stored = { current?: LessonSession; archive: LessonSession[] };

function read(presentationId: string): Stored {
  try {
    return JSON.parse(
      localStorage.getItem(KEY(presentationId)) ?? "",
    ) as Stored;
  } catch {
    return { archive: [] };
  }
}

function write(presentationId: string, stored: Stored) {
  try {
    localStorage.setItem(KEY(presentationId), JSON.stringify(stored));
  } catch {
    // Storage can be full or blocked; the lesson keeps running in memory.
  }
}

/** The running session survives a reload of the teacher window. */
export function loadSession(presentationId: string): LessonSession | undefined {
  return read(presentationId).current;
}

export function saveSession(session: LessonSession) {
  const id = session.presentationId;
  const stored = read(id);
  write(id, {
    ...stored,
    archive: stored.archive ?? [],
    current: session,
  });
}

/** Ends the lesson: the session moves to the local archive; the next starts empty. */
export function archiveSession(session: LessonSession) {
  const id = session.presentationId;
  const stored = read(id);
  write(id, { archive: [...(stored.archive ?? []), session] });
}
