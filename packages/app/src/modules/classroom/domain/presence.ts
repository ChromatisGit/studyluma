/**
 * Whether a teacher is leading a unit. A session without a teacher for long
 * enough ends; students are told earlier. Pure functions on the two fields
 * of the session that carry this.
 */
type Presence = {
  status: "open" | "ended";
  /**
   * Since when no teacher connection exists (or when the teacher was last
   * seen, for a teacher without a socket); null while a connection is open.
   */
  controllerAbsentSince: number | null;
};

/** Without a teacher connection for this long, students are told so. */
export const TEACHER_AWAY_NOTICE_MS = 3 * 60_000;
/** Without a teacher connection for this long, the unit ends. */
export const TEACHER_AWAY_END_MS = 15 * 60_000;

/** The teacher's last connection closed (`present: false`) or one opened. */
export function setControllerPresent<T extends Presence>(
  session: T,
  present: boolean,
  now: number,
): T {
  if (present) {
    return session.controllerAbsentSince === null
      ? session
      : { ...session, controllerAbsentSince: null };
  }
  return session.controllerAbsentSince === null
    ? { ...session, controllerAbsentSince: now }
    : session;
}

/** The teacher reached the session without a connection (polling). */
export function controllerSeen<T extends Presence>(session: T, now: number): T {
  return { ...session, controllerAbsentSince: now };
}

/** How long the teacher has been away; null while connected. */
export function teacherAwayFor(session: Presence, now: number): number | null {
  return session.controllerAbsentSince === null
    ? null
    : Math.max(0, now - session.controllerAbsentSince);
}

/** A unit nobody leads any more ends after `TEACHER_AWAY_END_MS`. */
export function isAbandoned(session: Presence, now: number): boolean {
  const away = teacherAwayFor(session, now);
  return (
    session.status === "open" && away !== null && away >= TEACHER_AWAY_END_MS
  );
}
