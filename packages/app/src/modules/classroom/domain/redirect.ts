/**
 * Whether a student device follows a sent worksheet. Pure: the provider
 * feeds in what the device knows and acts on the answer.
 */
export type SheetRedirectInput = {
  /** The sendId of the worksheet sent now; null: none. */
  sendId: string | null;
  /** Send ids this device has already followed or skipped. */
  seen: string[];
  /** A live quiz run is active for this student. */
  quizRunning: boolean;
  /** Where the sheet lives; null while that cannot be told yet. */
  path: string | null;
  /** The page the student is on. */
  pathname: string;
};

export type SheetRedirect = {
  /** Remember the send so it is not followed again. */
  remember: boolean;
  /** Navigate there, if set. */
  navigateTo: string | null;
};

const NOTHING: SheetRedirect = { remember: false, navigateTo: null };

export function sheetRedirect(input: SheetRedirectInput): SheetRedirect {
  const { sendId, seen, quizRunning, path, pathname } = input;
  if (sendId === null || seen.includes(sendId)) {
    return NOTHING;
  }
  // A quiz is never interrupted; the send is then not followed later either.
  if (quizRunning) {
    return { remember: true, navigateTo: null };
  }
  if (path === null) {
    return NOTHING;
  }
  return { remember: true, navigateTo: pathname === path ? null : path };
}
