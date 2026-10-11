import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { lessonStart, type Period } from "../domain/clock";
import type { Deck } from "../domain/deck";
import type { LessonSession } from "../domain/lesson";
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
// Session lifecycle, projector feed and clock belong to one hook.
// eslint-disable-next-line max-lines-per-function
export function useLessonSession(
  deck: Deck,
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
    const saved = loadSession(deck.id);
    const fresh = newSession(deck, opened, `s${opened.toString(36)}`);
    const reusable =
      saved && deck.slides.some((slide) => slide.id === saved.currentFrameId)
        ? saved
        : null;
    if (
      initialFrameId &&
      deck.slides.some((slide) => slide.id === initialFrameId)
    ) {
      fresh.currentFrameId = initialFrameId;
    }
    setSession(
      reusable && initialFrameId
        ? { ...reusable, currentFrameId: initialFrameId }
        : (reusable ?? fresh),
    );
    channel.current = openProjectorChannel(
      deck.id,
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
  }, [deck, initialFrameId]);

  const dispatch = useCallback(
    (action: DistributiveOmit<SessionAction, "now">) => {
      const previous = current.current;
      if (!previous) {
        return;
      }
      const next = reduceSession(deck, previous, {
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
    [deck],
  );

  const sendLaser = useCallback((point: [number, number] | null) => {
    channel.current?.send({ type: "laser", point });
  }, []);

  const sendScroll = useCallback((slideId: string, ratio: number) => {
    channel.current?.send({ type: "scroll", slideId, ratio });
  }, []);

  /** Ends the lesson; the next session starts empty at the first slide. */
  const endLesson = useCallback(() => {
    if (current.current) {
      archiveSession(current.current);
    }
    const opened = Date.now();
    const fresh = newSession(deck, opened, `s${opened.toString(36)}`);
    current.current = fresh;
    setSession(fresh);
    saveSession(fresh);
    // Keep the last image in the projector window until it is closed.
  }, [deck]);

  return {
    session,
    dispatch,
    sendLaser,
    sendScroll,
    endLesson,
    clock,
    projectorConnected,
  };
}

/** The projector window's side: it asks for the state and follows it. */
export function useProjectorFeed(presentationId: string) {
  const [session, setSession] = useState<LessonSession | null>(null);
  const [laser, setLaser] = useState<[number, number] | null>(null);
  const [scroll, setScroll] = useState<{
    slideId: string;
    ratio: number;
  } | null>(null);
  useEffect(() => {
    const link = openProjectorChannel(presentationId, (message) => {
      if (message.type === "state") {
        setSession(message.session);
      } else if (message.type === "laser") {
        setLaser(message.point);
      } else if (message.type === "scroll") {
        setScroll({ slideId: message.slideId, ratio: message.ratio });
      }
    });
    setSession(loadSession(presentationId) ?? null);
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
  }, [presentationId]);
  return { session, laser, scroll };
}
