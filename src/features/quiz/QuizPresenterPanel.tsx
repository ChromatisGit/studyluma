"use client";

import { useState, useEffect, useCallback } from "react";
import type { QuizResultsDTO } from "@schema/quizTypes";
import type { StoredQuestion } from "@schema/quizTypes";
import type { QuizMacro } from "@macros/quiz/types";
import type { Markdown } from "@schema/page";
import {
  startQuizAction,
  launchQuizAction,
  revealDistributionAction,
  revealCorrectAnswerAction,
  nextQuizQuestionAction,
  skipQuestionAction,
  closeQuizAction,
} from "@actions/quizActions";
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
  channelName: string;
  courseId: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuizPresenterPanel({ quizMacros, channelName, courseId }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [results, setResults] = useState<QuizResultsDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = quizMacros.map(macroToStoredQuestion);
  const timerSeconds =
    quizMacros[0]?.timer !== false && quizMacros[0]?.timer
      ? (quizMacros[0].timer as number)
      : null;

  // Poll results while session is active
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    let lastModified: string | null = null;

    const poll = async () => {
      if (!active) return;
      try {
        const headers: Record<string, string> = {};
        if (lastModified) headers["If-Modified-Since"] = lastModified;
        const res = await fetch(`/api/quiz/channel/${encodeURIComponent(channelName)}/results`, { headers });

        if (res.status === 304) {
          // unchanged
        } else if (res.status === 410) {
          setResults(null);
          active = false;
          return;
        } else if (res.ok) {
          const lm = res.headers.get("Last-Modified");
          if (lm) lastModified = lm;
          setResults(await res.json());
        }
      } catch { /* ignore */ }
      if (active) setTimeout(poll, 1000);
    };

    poll();
    return () => { active = false; };
  }, [sessionId, channelName]);

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
    const res = await startQuizAction(channelName, courseId, questions, timerSeconds);
    if (res.ok) {
      setSessionId(res.data.sessionId);
    } else {
      setError(res.error);
    }
    setBusy(false);
  }, [channelName, courseId, questions, timerSeconds]);

  // ---------------------------------------------------------------------------
  // If no session: show start button
  // ---------------------------------------------------------------------------

  if (!sessionId) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Quiz</span>
          <span className={styles.panelMeta}>{questions.length} Frage{questions.length !== 1 ? "n" : ""}</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={handleStart}
          disabled={busy || !courseId}
        >
          Quiz starten
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Phase-specific controls
  // ---------------------------------------------------------------------------

  const phase = results?.phase ?? "waiting";
  const idx = results?.currentIndex ?? 0;
  const total = results?.totalQuestions ?? questions.length;
  const answered = results?.answeredCount ?? 0;
  const participants = results?.participants ?? 0;
  const isLast = idx >= total - 1;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Quiz läuft</span>
        <span className={styles.panelMeta}>
          Frage {idx + 1} / {total}
        </span>
      </div>

      {/* Participation */}
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

      {error && <p className={styles.error}>{error}</p>}

      {/* Phase controls */}
      {phase === "waiting" && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={busy}
            onClick={() => call(() => launchQuizAction(sessionId))}
          >
            Starten
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={busy || isLast}
            onClick={() => call(() => skipQuestionAction(sessionId))}
          >
            Überspringen
          </button>
        </div>
      )}

      {phase === "active" && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={busy}
            onClick={() => call(() => revealDistributionAction(sessionId))}
          >
            Auswerten
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={busy}
            onClick={() => call(() => skipQuestionAction(sessionId))}
          >
            Überspringen
          </button>
        </div>
      )}

      {phase === "reveal_dist" && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={busy}
            onClick={() => call(() => revealCorrectAnswerAction(sessionId))}
          >
            Richtige Antwort zeigen
          </button>
        </div>
      )}

      {phase === "reveal_correct" && (
        <div className={styles.controls}>
          {isLast ? (
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={busy}
              onClick={() => call(() => closeQuizAction(sessionId))}
            >
              Quiz beenden
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
          )}
        </div>
      )}

      {phase === "closed" && (
        <p className={styles.closedNote}>Quiz beendet</p>
      )}
    </div>
  );
}
