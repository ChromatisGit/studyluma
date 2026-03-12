"use client";

import { useState, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";
import type { QuizResultsDTO, StoredQuestion } from "@schema/quizTypes";
import type { QuizMacro } from "@macros/quiz/types";
import type { Markdown } from "@schema/page";
import {
  startQuizAction,
  launchQuizAction,
  revealDistributionAction,
  revealCorrectAnswerAction,
  nextQuizQuestionAction,
  enterSummaryAction,
  closeQuizAction,
  forceCloseQuizForCourseAction,
} from "@actions/quizActions";
import { renderInlineMarkdown } from "@ui/lib/renderInlineMarkdown";
import styles from "./QuizPresenterPanel.module.css";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function markdownText(m: Markdown): string {
  return m.markdown;
}

function macroToStoredQuestion(q: QuizMacro): StoredQuestion {
  const correctSet = new Set(q.correct.map((c) => markdownText(c)));
  return {
    question: markdownText(q.question),
    options: q.options.map((o) => markdownText(o)),
    correctIndices: q.options
      .map((o, i) => (correctSet.has(markdownText(o)) ? i : -1))
      .filter((i) => i !== -1),
    why: q.why ? markdownText(q.why) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  quizMacros: QuizMacro[];
  courseId: string;
  /** Live quiz state pushed from the DO via WebSocket (null = no active quiz) */
  quizResults: QuizResultsDTO | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuizPresenterPanel({ quizMacros, courseId, quizResults }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = quizMacros.map(macroToStoredQuestion);

  // Derive session ID from live quiz results; after start, DO broadcasts QUIZ_STATE
  const sessionId = quizResults?.sessionId ?? null;

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const call = useCallback(async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    if (!res.ok) setError((res as { ok: false; error: string }).error);
    setBusy(false);
  }, []);

  const handleStart = useCallback(async () => {
    setBusy(true);
    setError(null);
    const res = await startQuizAction(courseId, questions);
    if (!res.ok) setError(res.error);
    setBusy(false);
  }, [courseId, questions]);

  // ---------------------------------------------------------------------------
  // No session: show start button + question preview
  // ---------------------------------------------------------------------------

  const isConflict = error?.includes("läuft bereits");

  if (!sessionId) {
    const firstQ = questions[0];
    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Quiz</span>
          <span className={styles.panelMeta}>{questions.length} Frage{questions.length !== 1 ? "n" : ""}</span>
        </div>

        {/* First question preview so teacher can read before starting */}
        {firstQ && (
          <div className={styles.questionPreview}>
            <p className={styles.previewLabel}>Erste Frage</p>
            <p className={styles.previewQuestion}>{renderInlineMarkdown(firstQ.question)}</p>
            <div className={styles.previewOptions}>
              {firstQ.options.map((opt, i) => (
                <div
                  key={i}
                  className={`${styles.previewOption} ${firstQ.correctIndices.includes(i) ? styles.previewOptionCorrect : ""}`}
                >
                  <span className={styles.previewLetter}>{String.fromCharCode(65 + i)}</span>
                  <span>{renderInlineMarkdown(opt)}</span>
                  {firstQ.correctIndices.includes(i) && (
                    <CheckCircle2 size={14} className={styles.previewCheck} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
        {isConflict ? (
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const res = await forceCloseQuizForCourseAction(courseId);
                if (res.ok) {
                  handleStart();
                } else {
                  setError((res as { ok: false; error: string }).error);
                  setBusy(false);
                }
              }}
            >
              Altes Quiz beenden & neu starten
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleStart}
            disabled={busy || !courseId}
          >
            Quiz starten
          </button>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Active session: phase controls
  // ---------------------------------------------------------------------------

  const phase = quizResults?.phase ?? "waiting";
  const idx = quizResults?.currentIndex ?? 0;
  const total = quizResults?.totalQuestions ?? questions.length;
  const answered = quizResults?.answeredCount ?? 0;
  const participants = quizResults?.participants ?? 0;
  const isLast = idx >= total - 1;
  const currentQ = questions[idx];

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Quiz läuft</span>
        <span className={styles.panelMeta}>Frage {idx + 1} / {total}</span>
      </div>

      {/* Current question + correct answers (private to teacher) */}
      {currentQ && phase !== "summary" && (
        <div className={styles.questionPreview}>
          <p className={styles.previewQuestion}>{renderInlineMarkdown(currentQ.question)}</p>
          <div className={styles.previewOptions}>
            {currentQ.options.map((opt, i) => (
              <div
                key={i}
                className={`${styles.previewOption} ${currentQ.correctIndices.includes(i) ? styles.previewOptionCorrect : ""}`}
              >
                <span className={styles.previewLetter}>{String.fromCharCode(65 + i)}</span>
                <span>{renderInlineMarkdown(opt)}</span>
                {currentQ.correctIndices.includes(i) && (
                  <CheckCircle2 size={14} className={styles.previewCheck} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participation counter */}
      {phase !== "waiting" && phase !== "summary" && phase !== "closed" && (
        <div className={styles.participation}>
          <span className={styles.participationCount}>
            {answered} / {participants} geantwortet
          </span>
          {participants > 0 && (
            <div className={styles.participationBar}>
              <div
                className={styles.participationFill}
                style={{ width: `${Math.round((answered / participants) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {phase === "waiting" && (
        <div className={styles.participation}>
          <span className={styles.participationCount}>{participants} dabei</span>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {/* Phase controls */}
      {phase === "waiting" && (
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={busy}
          onClick={() => call(() => launchQuizAction(sessionId))}
        >
          Starten
        </button>
      )}

      {phase === "active" && (
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={busy}
          onClick={() => call(() => revealDistributionAction(sessionId))}
        >
          Auswerten
        </button>
      )}

      {phase === "reveal_dist" && (
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={busy}
          onClick={() => call(() => revealCorrectAnswerAction(sessionId))}
        >
          Richtige Antwort zeigen
        </button>
      )}

      {phase === "reveal_correct" && (
        isLast ? (
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={busy}
            onClick={() => call(() => enterSummaryAction(sessionId))}
          >
            Zusammenfassung zeigen
          </button>
        ) : (
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={busy}
            onClick={() => call(() => nextQuizQuestionAction(sessionId))}
          >
            Nächste Frage
          </button>
        )
      )}

      {phase === "summary" && (
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={busy}
          onClick={() => call(() => closeQuizAction(sessionId))}
        >
          Zum Unterricht zurück
        </button>
      )}

      {phase === "closed" && (
        <p className={styles.closedNote}>Quiz beendet</p>
      )}
    </div>
  );
}
