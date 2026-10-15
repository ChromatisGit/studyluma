import { useEffect, useState } from "react";
import {
  createClassroom,
  endClassroom,
  readClassroom,
  useSharedClassroom,
  useSite,
} from "../../classroom";
import { lessonStart, type Period } from "../domain/clock";
import { startUnit, type Unit } from "../domain/unit";
import { archiveUnit, loadUnit, saveUnit } from "../infrastructure/unitStorage";

export type BeginUnit = {
  courseId: string;
  presentationId: string;
  /** The lesson page of the deck, to come back to. */
  path: string;
  periods: Period[];
  /** Whether the instance has a classroom; without it the unit is local only. */
  classroom: boolean;
  /** A session this browser already leads (its local unit was lost): taken over, not replaced. */
  existingCode: string | null;
  /** Runs after the session exists, so the pages know their cookie before the unit shows. */
  refresh: () => Promise<void>;
};

/**
 * Starts a unit: a session on the server (where there is a classroom) and the
 * local presentation state, with the clock start chosen once. Returns null if
 * the session could not be started.
 */
export async function beginUnit(input: BeginUnit): Promise<Unit | null> {
  const running = loadUnit();
  if (running) {
    return running;
  }
  let sessionCode: string | null = null;
  if (input.classroom) {
    sessionCode = input.existingCode;
    if (!sessionCode) {
      sessionCode = await createClassroom(input.courseId);
      if (!sessionCode) {
        return null;
      }
      await input.refresh();
    }
  }
  const opened = new Date();
  const unit = startUnit({
    id: `u${opened.getTime().toString(36)}`,
    courseId: input.courseId,
    presentationId: input.presentationId,
    path: input.path,
    openedAt: opened.getTime(),
    clock: lessonStart(opened, input.periods),
    sessionCode,
  });
  saveUnit(unit);
  return unit;
}

/** Ends the unit for everybody: the session, then the local archive. */
export async function finishUnit(unit: Unit): Promise<void> {
  if (unit.sessionCode) {
    await endClassroom();
  }
  archiveUnit(unit);
}

/** How often a unit asks whether its session is still there, besides what the live connection tells. */
const SESSION_CHECK_MS = 30_000;

/**
 * A unit whose session is gone (the teacher was away too long, it was ended
 * elsewhere, the cookie is lost) is over here too: it moves to the archive.
 */
export function useEndedSessionGuard(unit: Unit | undefined) {
  const site = useSite();
  const { snapshot } = useSharedClassroom(
    site.classroom?.role === "controller",
  );
  const code = unit?.sessionCode;
  const [gone, setGone] = useState(false);
  useEffect(() => {
    setGone(false);
    if (!code) {
      return;
    }
    let stopped = false;
    const check = async () => {
      if ((await readClassroom()) === null && !stopped) {
        setGone(true);
      }
    };
    void check();
    const timer = setInterval(() => void check(), SESSION_CHECK_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [code]);
  const ended = gone || (!!code && snapshot === null);
  useEffect(() => {
    if (ended && unit) {
      archiveUnit(unit);
    }
  }, [ended, unit]);
}
