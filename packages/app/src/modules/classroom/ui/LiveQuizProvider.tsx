import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { Link, useLocation, useNavigate, useRevalidator } from "react-router";
import { ArrowRight, Radio } from "lucide-react";
import { SheetReporterContext } from "../../worksheets";
import { useStudentQuizzes } from "../application/useLiveQuiz";
import { sheetRedirect } from "../domain/redirect";
import type { Target } from "../domain/session";
import type { StudentQuizView } from "../domain/views";
import TEXT from "./classroom.de.json";

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

export interface LiveQuizProviderProps {
  /** Only students take part; teachers run the quiz from the lesson. */
  enabled: boolean;
  quizPath: (courseId: string) => string;
  /** Where a sent worksheet is; null while it cannot be told yet. */
  sheetPath: (target: Target, courseId: string | null) => string | null;
  children: ReactNode;
}

/** One connection per tab for all pages of the shell. */
export function LiveQuizProvider({
  enabled,
  quizPath,
  sheetPath,
  children,
}: LiveQuizProviderProps) {
  const live = useStudentQuizzes(enabled);
  useQuizRedirect(enabled ? live.views : undefined, quizPath);
  useSheetRedirect(
    enabled ? live.sent : undefined,
    enabled ? live.views : undefined,
    sheetPath,
  );
  useSessionRefresh(enabled ? live.sync : undefined);
  return (
    <LiveQuizContext.Provider value={live}>
      <SheetReporterContext.Provider value={enabled ? live.reporter : null}>
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
        {children}
      </SheetReporterContext.Provider>
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
    }
  );
}
