import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useStudentQuizzes } from "../application/useLiveQuiz";
import type { StudentQuizView } from "../domain/views";

type LiveQuiz = ReturnType<typeof useStudentQuizzes>;

const LiveQuizContext = createContext<LiveQuiz | null>(null);

const REDIRECTED = "studyluma-quiz-redirected";

function redirectedRuns(): string[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(REDIRECTED) ?? "[]",
    );
    return Array.isArray(stored) ? stored.map(String) : [];
  } catch {
    return [];
  }
}

function rememberRedirect(runId: string) {
  try {
    const runs = redirectedRuns().filter((id) => id !== runId);
    localStorage.setItem(
      REDIRECTED,
      JSON.stringify([...runs, runId].slice(-20)),
    );
  } catch {
    // without storage the student may be sent to the quiz again; harmless
  }
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
      const seen = redirectedRuns().includes(view.runId);
      rememberRedirect(view.runId);
      if (pathname !== target && !seen) {
        void navigate(target);
        return;
      }
    }
  }, [views, pathname, quizPath, navigate]);
}

export interface LiveQuizProviderProps {
  /** Only students take part; teachers run the quiz from the lesson. */
  enabled: boolean;
  quizPath: (courseId: string) => string;
  children: ReactNode;
}

/** One connection per tab for all pages of the shell. */
export function LiveQuizProvider({
  enabled,
  quizPath,
  children,
}: LiveQuizProviderProps) {
  const live = useStudentQuizzes(enabled);
  useQuizRedirect(enabled ? live.views : undefined, quizPath);
  return (
    <LiveQuizContext.Provider value={live}>{children}</LiveQuizContext.Provider>
  );
}

export function useLiveQuiz(): LiveQuiz {
  return (
    useContext(LiveQuizContext) ?? {
      views: undefined,
      answer: async () => false,
    }
  );
}
