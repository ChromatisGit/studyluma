import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { clockStartFor, type ClockStart, type Period } from "../domain/clock";
import type { TeacherQuizView } from "../../classroom";
import type { Deck } from "../domain/deck";
import type { DeckState } from "../domain/lesson";
import type { SessionAction } from "../domain/session";
import {
  deckState,
  reduceUnit,
  showDeck,
  withClock,
  type Unit,
} from "../domain/unit";
import {
  openProjectorChannel,
  type JoinInfo,
  type ProjectorMessage,
} from "../infrastructure/projectorChannel";
import { loadUnit, saveUnit, unitStore } from "../infrastructure/unitStorage";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** The running unit of this browser, followed across windows and reloads. */
export function useRunningUnit(): Unit | undefined {
  return useSyncExternalStore(
    unitStore.subscribe,
    unitStore.getSnapshot,
    unitStore.getServerSnapshot,
  );
}

/** Seconds of lesson time, ticking every second. */
export function useLessonClock(
  clock: ClockStart | undefined,
  periods: Period[],
) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const startsAt = clock?.startsAt ?? now;
  return {
    seconds: Math.floor((now - startsAt) / 1000),
    period:
      periods.find((period) => period.number === clock?.periodNumber) ?? null,
  };
}

export type UnitPosition = {
  /** The deck on the stage. */
  deck: Deck;
  /** Where the teacher window shows it, to come back to. */
  path: string;
  /** Where the projector window shows it. */
  projectorPath: string;
};

/**
 * The teacher's running unit: saved in this browser, so a reload keeps
 * positions, ink and branches, and the deck on the stage is mirrored to the
 * projector window.
 */
// Unit lifecycle, projector feed and clock belong to one hook.
// eslint-disable-next-line max-lines-per-function
export function useLessonSession(
  { deck, path, projectorPath }: UnitPosition,
  periods: Period[],
  initialFrameId?: string,
) {
  const unit = useRunningUnit();
  const [projectorConnected, setProjectorConnected] = useState(false);
  const projectorSeen = useRef(0);
  const channel = useRef<ReturnType<typeof openProjectorChannel>>(null);
  const clock = useLessonClock(unit?.clock, periods);
  const seconds = useRef(clock.seconds);
  const state = unit ? deckState(unit, deck) : null;
  const stateRef = useRef<{ message: ProjectorMessage } | null>(null);
  const joinRef = useRef<JoinInfo | null>(null);
  const quizRef = useRef<TeacherQuizView | null>(null);
  useLayoutEffect(() => {
    seconds.current = clock.seconds;
    stateRef.current = state
      ? {
          message: {
            type: "state",
            presentationId: deck.id,
            projectorPath,
            deck: state,
          },
        }
      : null;
  });

  useEffect(() => {
    channel.current = openProjectorChannel((message: ProjectorMessage) => {
      if (message.type === "hello" || message.type === "ping") {
        projectorSeen.current = Date.now();
        setProjectorConnected(true);
        if (message.type === "hello") {
          if (stateRef.current) {
            channel.current?.send(stateRef.current.message);
          }
          channel.current?.send({ type: "join", join: joinRef.current });
          channel.current?.send({ type: "quiz", view: quizRef.current });
        }
      } else if (message.type === "bye") {
        projectorSeen.current = 0;
        setProjectorConnected(false);
      }
    });
    // A projector window pings every 2 s; silence for 5 s means it is gone.
    const heartbeat = setInterval(
      () => setProjectorConnected(Date.now() - projectorSeen.current < 5000),
      2000,
    );
    return () => {
      clearInterval(heartbeat);
      channel.current?.close();
    };
  }, []);

  // The deck on the stage is the unit's active one; the first visit starts it.
  const entered = useRef<string | null>(null);
  useEffect(() => {
    const current = loadUnit();
    if (!current) {
      return;
    }
    let next = showDeck(current, deck, path);
    const key = `${current.id}:${deck.id}`;
    if (
      initialFrameId &&
      entered.current !== key &&
      deck.slides.some((slide) => slide.id === initialFrameId)
    ) {
      next = reduceUnit(next, deck, {
        type: "go",
        frameId: initialFrameId,
        now: seconds.current,
      });
    }
    entered.current = key;
    if (next !== current) {
      saveUnit(next);
    }
  }, [deck, path, initialFrameId, unit?.id]);

  useEffect(() => {
    if (stateRef.current) {
      channel.current?.send(stateRef.current.message);
    }
  }, [state, deck.id, projectorPath]);

  const dispatch = useCallback(
    (action: DistributiveOmit<SessionAction, "now">) => {
      const previous = loadUnit();
      if (!previous) {
        return;
      }
      const next = reduceUnit(previous, deck, {
        ...action,
        now: seconds.current,
      } as SessionAction);
      if (next !== previous) {
        saveUnit(next);
      }
    },
    [deck],
  );

  /** Corrects where lesson time counts from: a period, or "ab jetzt" (null). */
  const setClockStart = useCallback((period: Period | null) => {
    const previous = loadUnit();
    if (previous) {
      // "Ab jetzt" counts from the start of the unit, not from the correction.
      const at = period ? new Date() : new Date(previous.openedAt);
      saveUnit(withClock(previous, clockStartFor(at, period)));
    }
  }, []);

  const sendLaser = useCallback((point: [number, number] | null) => {
    channel.current?.send({ type: "laser", point });
  }, []);

  const sendScroll = useCallback((slideId: string, ratio: number) => {
    channel.current?.send({ type: "scroll", slideId, ratio });
  }, []);

  /** What the projector shows instead of the slide; null: the slide again. */
  const sendJoin = useCallback((join: JoinInfo | null) => {
    joinRef.current = join;
    channel.current?.send({ type: "join", join });
  }, []);

  /**
   * The running quiz, for the projector. The projector does not follow the
   * classroom itself: a session started after it opened would stay unseen.
   */
  const sendQuiz = useCallback((view: TeacherQuizView | null) => {
    quizRef.current = view;
    channel.current?.send({ type: "quiz", view });
  }, []);

  return {
    unit,
    session: state satisfies DeckState | null,
    dispatch,
    sendLaser,
    sendScroll,
    sendJoin,
    sendQuiz,
    setClockStart,
    clock,
    projectorConnected,
  };
}

/** The projector window's side: it asks for the state and follows it. */
export function useProjectorFeed() {
  const [feed, setFeed] = useState<{
    presentationId: string;
    projectorPath: string;
    deck: DeckState;
  } | null>(null);
  const [join, setJoin] = useState<JoinInfo | null>(null);
  const [quiz, setQuiz] = useState<TeacherQuizView | null>(null);
  const [laser, setLaser] = useState<[number, number] | null>(null);
  const [scroll, setScroll] = useState<{
    slideId: string;
    ratio: number;
  } | null>(null);
  useEffect(() => {
    const link = openProjectorChannel((message) => {
      if (message.type === "state") {
        const { presentationId, projectorPath, deck } = message;
        setFeed({ presentationId, projectorPath, deck });
      } else if (message.type === "join") {
        setJoin(message.join);
      } else if (message.type === "quiz") {
        setQuiz(message.view);
      } else if (message.type === "laser") {
        setLaser(message.point);
      } else if (message.type === "scroll") {
        setScroll({ slideId: message.slideId, ratio: message.ratio });
      }
    });
    const saved = loadUnit();
    const active = saved?.decks[saved.activePresentationId];
    if (saved && active) {
      setFeed({
        presentationId: saved.activePresentationId,
        projectorPath: "",
        deck: active,
      });
    }
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
  }, []);
  return { feed, join, quiz, laser, scroll };
}
