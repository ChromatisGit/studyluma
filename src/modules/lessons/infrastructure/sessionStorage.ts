import type { LessonSession } from "../domain/lesson";

const KEY = (chapterId: string) => `studyluma:lesson:${chapterId}`;

type Stored = { current?: LessonSession; archive: LessonSession[] };

function read(chapterId: string): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY(chapterId)) ?? "") as Stored;
  } catch {
    return { archive: [] };
  }
}

function write(chapterId: string, stored: Stored) {
  try {
    localStorage.setItem(KEY(chapterId), JSON.stringify(stored));
  } catch {
    // Storage can be full or blocked; the lesson keeps running in memory.
  }
}

/** The running session survives a reload of the teacher window. */
export function loadSession(chapterId: string): LessonSession | undefined {
  return read(chapterId).current;
}

export function saveSession(session: LessonSession) {
  const stored = read(session.chapterId);
  write(session.chapterId, {
    ...stored,
    archive: stored.archive ?? [],
    current: session,
  });
}

/** Ends the lesson: the session moves to the local archive; the next starts empty. */
export function archiveSession(session: LessonSession) {
  const stored = read(session.chapterId);
  write(session.chapterId, { archive: [...(stored.archive ?? []), session] });
}
