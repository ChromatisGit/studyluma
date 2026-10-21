import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation, useNavigate, useRevalidator } from "react-router";
import { ArrowRight, Radio } from "lucide-react";
import { SheetReporterContext, SheetsPausedContext } from "../../worksheets";
import { fill } from "../../../helper/text";
import { useStudentQuizzes } from "../application/useLiveQuiz";
import {
  allows,
  needsCountdown,
  RETURN_SECONDS,
  type DeviceArea,
} from "../domain/focus";
import { sheetRedirect } from "../domain/redirect";
import type { Phase, Target } from "../domain/session";
import type { StudentQuizView } from "../domain/views";
import TEXT from "./classroom.de.json";
import "./calm.css";

type LiveQuiz = ReturnType<typeof useStudentQuizzes>;

const LiveQuizContext = createContext<LiveQuiz | null>(null);

const REDIRECTED = "studyluma-quiz-redirected";
const SHEET_SENT = "studyluma-sheet-redirected";

function seenIds(key: string): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(stored) ? stored.map(String) : [];
  } catch {
    return [];
  }
}

function remember(key: string, id: string) {
  try {
    const ids = seenIds(key).filter((item) => item !== id);
    localStorage.setItem(key, JSON.stringify([...ids, id].slice(-20)));
  } catch {
    // without storage the student may be sent again; harmless
  }
}

/** The quiz the student takes part in right now, if any. */
function liveView(views: StudentQuizView[] | undefined) {
  return views?.find((view) => !view.ended);
}

/**
 * Sends the student to a quiz once, when it starts or when the student
 * arrives while it runs. Afterwards navigation is free again.
 */
function useQuizRedirect(
  views: StudentQuizView[] | undefined,
  quizPath: (courseId: string) => string,
) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    for (const view of views ?? []) {
      if (view.ended) {
        continue;
      }
      const target = quizPath(view.courseId);
      const seen = seenIds(REDIRECTED).includes(view.runId);
      remember(REDIRECTED, view.runId);
      if (pathname !== target && !seen) {
        void navigate(target);
        return;
      }
    }
  }, [views, pathname, quizPath, navigate]);
}

/**
 * Opens the worksheet the teacher sends, once per send: when it is sent, or
 * when the student arrives while it is active. A send the device has seen is
 * not followed again (reload, later navigation); sending the same sheet anew
 * is a new send. A running quiz is never interrupted.
 */
function useSheetRedirect(
  sent: { target: Target | null; courseId: string | null } | undefined,
  views: StudentQuizView[] | undefined,
  sheetPath: (target: Target, courseId: string | null) => string | null,
) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const target = sent?.target;
  const courseId = sent?.courseId ?? null;
  const quizRunning = liveView(views) !== undefined;
  useEffect(() => {
    // Until both the quiz and the target are known, nothing is decided.
    if (!target || views === undefined) {
      return;
    }
    const { remember: keep, navigateTo } = sheetRedirect({
      sendId: target.sendId,
      seen: seenIds(SHEET_SENT),
      quizRunning,
      path: quizRunning ? null : sheetPath(target, courseId),
      pathname,
    });
    if (keep) {
      remember(SHEET_SENT, target.sendId);
    }
    if (navigateTo !== null) {
      void navigate(navigateTo);
    }
  }, [target, courseId, views, quizRunning, pathname, sheetPath, navigate]);
}

/**
 * Pages read what the teacher released and sent from their loader data.
 * When the session reports a change, the data is loaded again.
 */
function useSessionRefresh(sync: string | undefined) {
  const revalidator = useRevalidator();
  const seen = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (sync === undefined) {
      return;
    }
    // The first snapshot is what the page was loaded with.
    if (seen.current !== undefined && seen.current !== sync) {
      void revalidator.revalidate();
    }
    seen.current = sync;
  }, [sync, revalidator]);
}

type Shown = {
  /** The session's phase as last seen. */
  seen: Phase | undefined;
  /** The phase the device shows; it lags behind during the countdown. */
  shown: Phase | undefined;
  counting: boolean;
};

/**
 * The phase the device shows. Leaving a green phase holds the old one for a
 * visible countdown (like the end of a breakout room); every other change
 * shows at once, and a change back during the countdown cancels it.
 */
function useShownPhase(phase: Phase | undefined) {
  const [state, setState] = useState<Shown>({
    seen: phase,
    shown: phase,
    counting: false,
  });
  const [left, setLeft] = useState(RETURN_SECONDS);
  let current = state;
  if (phase !== state.seen) {
    // Derived from the snapshot during render, so a page never sees a
    // phase the device does not show yet.
    current =
      phase && state.shown && needsCountdown(state.shown, phase)
        ? { seen: phase, shown: state.shown, counting: true }
        : { seen: phase, shown: phase, counting: false };
    setState(current);
  }
  useEffect(() => {
    if (!state.counting) {
      return;
    }
    const end = Date.now() + RETURN_SECONDS * 1000;
    setLeft(RETURN_SECONDS);
    const timer = setInterval(() => {
      const rest = Math.ceil((end - Date.now()) / 1000);
      if (rest > 0) {
        setLeft(rest);
        return;
      }
      setState((now) => ({ ...now, shown: now.seen, counting: false }));
    }, 250);
    return () => clearInterval(timer);
  }, [state.counting]);
  return { shown: current.shown, countdown: current.counting ? left : null };
}

/**
 * Brings the student back to the calm view from a page the shown phase does
 * not open (after the countdown, after a quiz, or a page typed in by hand).
 */
function useWayBack(
  phase: Phase | undefined,
  area: DeviceArea,
  quizRunning: boolean | undefined,
  calmPath: string,
) {
  const navigate = useNavigate();
  useEffect(() => {
    if (
      phase !== undefined &&
      quizRunning !== undefined &&
      !allows(phase, area, quizRunning)
    ) {
      void navigate(calmPath, { replace: true });
    }
  }, [phase, area, quizRunning, calmPath, navigate]);
}

export type DeviceFocus = {
  /** The phase the device shows; undefined outside a running session. */
  phase: Phase | undefined;
  /** Seconds until the device goes back; null when no countdown runs. */
  countdown: number | null;
  /** The student's name in the session. */
  name: string | null;
};

const DeviceFocusContext = createContext<DeviceFocus>({
  phase: undefined,
  countdown: null,
  name: null,
});

/** What the student device shows now. */
export const useDeviceFocus = () => useContext(DeviceFocusContext);

function ReturnCountdown({ seconds }: { seconds: number }) {
  return (
    <p className="device-return" role="status">
      {fill(seconds === 1 ? TEXT.device.returnOne : TEXT.device.returnMany, {
        seconds,
      })}
      <span
        className="device-return__bar"
        style={{ "--return-seconds": `${RETURN_SECONDS}s` } as object}
        aria-hidden="true"
      />
    </p>
  );
}

/**
 * The way back to a quiz that is running, on every page but the quiz itself.
 * The redirect happens once; this stays until the run ends.
 */
function QuizBanner({
  views,
  quizPath,
}: {
  views: StudentQuizView[] | undefined;
  quizPath: (courseId: string) => string;
}) {
  const { pathname } = useLocation();
  const view = liveView(views);
  if (!view || pathname === quizPath(view.courseId)) {
    return null;
  }
  return (
    <Link className="quiz-running" to={quizPath(view.courseId)}>
      <Radio aria-hidden="true" />
      <span>{TEXT.quizRunning}</span>
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

const BannersContext = createContext<ReactNode>(null);

/**
 * The provider's notices (teacher away, quiz running, the way back). The
 * provider wraps the whole shell, so the sidebar knows the phase as well;
 * the notices go where the page content starts.
 */
export function LiveBanners() {
  return <>{useContext(BannersContext)}</>;
}

export interface LiveQuizProviderProps {
  /** Only students take part; teachers run the quiz from the lesson. */
  enabled: boolean;
  /** Where the open page belongs. */
  area: DeviceArea;
  /** The calm view, where the device goes back to. */
  calmPath: string;
  quizPath: (courseId: string) => string;
  /** Where a sent worksheet is; null while it cannot be told yet. */
  sheetPath: (target: Target, courseId: string | null) => string | null;
  children: ReactNode;
}

/** The student's live session for all pages of the shell; place `LiveBanners` where the content starts. */
export function LiveQuizProvider({
  enabled,
  area,
  calmPath,
  quizPath,
  sheetPath,
  children,
}: LiveQuizProviderProps) {
  const live = useStudentQuizzes(enabled);
  const following = enabled && !live.ended;
  const { shown, countdown } = useShownPhase(
    following ? live.phase : undefined,
  );
  const quizRunning =
    following && live.views !== undefined
      ? liveView(live.views) !== undefined
      : undefined;
  useWayBack(shown, area, quizRunning, calmPath);
  const focus: DeviceFocus = { phase: shown, countdown, name: live.name };
  const banners = (
    <>
      {enabled && live.ended && (
        <p className="teacher-away" role="status">
          {TEXT.unitEnded}
        </p>
      )}
      {enabled && !live.ended && live.teacherAway && (
        <p className="teacher-away" role="status">
          {TEXT.teacherAway}
        </p>
      )}
      {enabled && !live.ended && (
        <QuizBanner views={live.views} quizPath={quizPath} />
      )}
      {/* A running quiz is where the device is; nothing to come back from. */}
      {countdown !== null && !quizRunning && (
        <ReturnCountdown seconds={countdown} />
      )}
    </>
  );
  useQuizRedirect(enabled ? live.views : undefined, quizPath);
  useSheetRedirect(
    enabled ? live.sent : undefined,
    enabled ? live.views : undefined,
    sheetPath,
  );
  useSessionRefresh(enabled ? live.sync : undefined);
  return (
    <LiveQuizContext.Provider value={live}>
      <DeviceFocusContext.Provider value={focus}>
        <SheetsPausedContext.Provider
          value={shown !== undefined && shown !== "arbeitsblatt"}
        >
          <SheetReporterContext.Provider value={enabled ? live.reporter : null}>
            <BannersContext.Provider value={banners}>
              {children}
            </BannersContext.Provider>
          </SheetReporterContext.Provider>
        </SheetsPausedContext.Provider>
      </DeviceFocusContext.Provider>
    </LiveQuizContext.Provider>
  );
}

export function useLiveQuiz(): LiveQuiz {
  return (
    useContext(LiveQuizContext) ?? {
      views: undefined,
      answer: async () => false,
      sync: undefined,
      teacherAway: false,
      sent: undefined,
      ended: false,
      reporter: { progress: () => undefined, ampel: () => undefined },
      phase: undefined,
      name: null,
    }
  );
}
