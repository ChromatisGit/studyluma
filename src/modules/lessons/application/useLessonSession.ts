import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { lessonStart, type Period } from "../domain/clock";
import type { Lesson, LessonSession } from "../domain/lesson";
import {
  newSession,
  reduceSession,
  type SessionAction,
} from "../domain/session";
import {
  openProjectorChannel,
  type ProjectorMessage,
} from "../infrastructure/projectorChannel";
import {
  archiveSession,
  loadSession,
  saveSession,
} from "../infrastructure/sessionStorage";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** Seconds of lesson time, ticking every second. */
export function useLessonClock(
  periods: Period[],
  openedAt: number | undefined,
) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { start, period } = lessonStart(
    new Date(now),
    periods,
    new Date(openedAt ?? now),
  );
  return { seconds: Math.floor((now - start.getTime()) / 1000), period };
}

/**
 * The teacher's running lesson: saved in this browser, so a reload keeps
 * position, ink and branches, and mirrored to the projector window.
 */
export function useLessonSession(
  lesson: Lesson,
  periods: Period[],
  initialFrameId?: string,
) {
  const [session, setSession] = useState<LessonSession | null>(null);
  const [projectorConnected, setProjectorConnected] = useState(false);
  const projectorSeen = useRef(0);
  const channel = useRef<ReturnType<typeof openProjectorChannel>>(null);
  const current = useRef<LessonSession | null>(null);
  const clock = useLessonClock(periods, session?.openedAt);
  const seconds = useRef(clock.seconds);
  useLayoutEffect(() => {
    current.current = session;
    seconds.current = clock.seconds;
  });

  useEffect(() => {
    const opened = Date.now();
    const saved = loadSession(lesson.chapterId);
    const fresh = newSession(lesson, opened, `s${opened.toString(36)}`);
    if (
      initialFrameId &&
      lesson.frames.some((frame) => frame.id === initialFrameId)
    ) {
      fresh.currentFrameId = initialFrameId;
    }
    setSession(
      saved && initialFrameId
        ? { ...saved, currentFrameId: initialFrameId }
        : (saved ?? fresh),
    );
    channel.current = openProjectorChannel(
      lesson.chapterId,
      (message: ProjectorMessage) => {
        if (message.type === "hello" || message.type === "ping") {
          projectorSeen.current = Date.now();
          setProjectorConnected(true);
          if (message.type === "hello" && current.current) {
            channel.current?.send({ type: "state", session: current.current });
          }
        } else if (message.type === "bye") {
          projectorSeen.current = 0;
          setProjectorConnected(false);
        }
      },
    );
    // A projector window pings every 2 s; silence for 5 s means it is gone.
    const heartbeat = setInterval(
      () => setProjectorConnected(Date.now() - projectorSeen.current < 5000),
      2000,
    );
    return () => {
      clearInterval(heartbeat);
      channel.current?.close();
    };
  }, [lesson, initialFrameId]);

  const dispatch = useCallback(
    (action: DistributiveOmit<SessionAction, "now">) => {
      const previous = current.current;
      if (!previous) {
        return;
      }
      const next = reduceSession(lesson, previous, {
        ...action,
        now: seconds.current,
      } as SessionAction);
      if (next === previous) {
        return;
      }
      current.current = next;
      setSession(next);
      saveSession(next);
      channel.current?.send({ type: "state", session: next });
    },
    [lesson],
  );

  const sendLaser = useCallback((point: [number, number] | null) => {
    channel.current?.send({ type: "laser", point });
  }, []);

  /** Ends the lesson; the next session starts empty at the first frame. */
  const endLesson = useCallback(() => {
    if (current.current) {
      archiveSession(current.current);
    }
    const opened = Date.now();
    const fresh = newSession(lesson, opened, `s${opened.toString(36)}`);
    current.current = fresh;
    setSession(fresh);
    saveSession(fresh);
    channel.current?.send({ type: "state", session: fresh });
  }, [lesson]);

  return {
    session,
    dispatch,
    sendLaser,
    endLesson,
    clock,
    projectorConnected,
  };
}

/** The projector window's side: it asks for the state and follows it. */
export function useProjectorFeed(chapterId: string) {
  const [session, setSession] = useState<LessonSession | null>(null);
  const [laser, setLaser] = useState<[number, number] | null>(null);
  useEffect(() => {
    const link = openProjectorChannel(chapterId, (message) => {
      if (message.type === "state") {
        setSession(message.session);
      } else if (message.type === "laser") {
        setLaser(message.point);
      }
    });
    setSession(loadSession(chapterId) ?? null);
    link?.send({ type: "hello" });
    const ping = setInterval(() => link?.send({ type: "ping" }), 2000);
    const bye = () => link?.send({ type: "bye" });
    window.addEventListener("pagehide", bye);
    return () => {
      clearInterval(ping);
      window.removeEventListener("pagehide", bye);
      bye();
      link?.close();
    };
  }, [chapterId]);
  return { session, laser };
}
