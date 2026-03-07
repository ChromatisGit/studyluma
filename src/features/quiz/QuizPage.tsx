"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, ClipboardList, Timer, Users } from "lucide-react";
import { Button } from "@components/Button";
import { pollActiveQuizAction, joinQuizAction, submitQuizResponseAction } from "@actions/quizActions";
import type { QuizStateDTO } from "@schema/quizTypes";
import styles from "./QuizPage.module.css";

type QuizPageProps = {
  initialState: QuizStateDTO | null;
};

export function QuizPage({ initialState }: QuizPageProps) {
  const [quiz, setQuiz] = useState<QuizStateDTO | null>(initialState);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const lastIndexRef = useRef<number | null>(initialState?.currentIndex ?? null);

  // Reset per-question state when the question index changes
  useEffect(() => {
    if (quiz && quiz.currentIndex !== lastIndexRef.current) {
      lastIndexRef.current = quiz.currentIndex;
      setSelectedAnswer(null);
      setHasSubmitted(false);
    }
  }, [quiz]);

  // Countdown timer
  useEffect(() => {
    if (!quiz?.timerSeconds || !quiz.timerStartedAt || quiz.phase !== "active") {
      setTimeLeft(null);
      return;
    }
    const end = new Date(quiz.timerStartedAt).getTime() + quiz.timerSeconds * 1000;
    const tick = () => setTimeLeft(Math.max(0, Math.round((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [quiz?.timerStartedAt, quiz?.timerSeconds, quiz?.phase]);

  // Poll for state updates every 4 seconds
  useEffect(() => {
    const id = setInterval(async () => {
      const result = await pollActiveQuizAction();
      if (result.ok) setQuiz(result.data);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Auto-join when a session becomes available
  useEffect(() => {
    if (quiz?.sessionId) {
      joinQuizAction(quiz.sessionId);
    }
  }, [quiz?.sessionId]);

  const handleSubmit = async () => {
    if (!quiz || selectedAnswer === null || hasSubmitted) return;
    setHasSubmitted(true);
    await submitQuizResponseAction(quiz.sessionId, quiz.currentIndex, [selectedAnswer], false);
  };

  // ── No active quiz ──────────────────────────────────────────────────────
  if (!quiz) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <ClipboardList size={56} className={styles.emptyIcon} aria-hidden />
          <h1 className={styles.emptyTitle}>No quiz active</h1>
          <p className={styles.emptyDesc}>
            Your teacher will start a quiz — come back here when they announce it.
          </p>
        </div>
      </div>
    );
  }

  // ── Waiting ─────────────────────────────────────────────────────────────
  if (quiz.phase === "waiting") {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden>⏳</div>
          <h1 className={styles.emptyTitle}>Quiz starting…</h1>
          <p className={styles.emptyDesc}>Your teacher is about to launch the first question.</p>
        </div>
      </div>
    );
  }

  const progress = ((quiz.currentIndex + 1) / quiz.totalQuestions) * 100;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.meta}>
            <span className={styles.progress}>
              <Users size={14} aria-hidden />
              Question {quiz.currentIndex + 1} of {quiz.totalQuestions}
            </span>
            {timeLeft !== null && quiz.phase === "active" && (
              <span className={timeLeft <= 10 ? styles.timerUrgent : styles.timer}>
                <Timer size={14} aria-hidden />
                {timeLeft}s
              </span>
            )}
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question */}
        <div className={styles.questionCard}>
          <p className={styles.question}>{quiz.question}</p>

          <div className={styles.options}>
            {quiz.options.map((option, i) => {
              const isSelected = selectedAnswer === i;
              const isCorrect = quiz.correctIndices?.includes(i);
              const isReveal =
                quiz.phase === "reveal_correct" || quiz.phase === "reveal_dist";

              let optionClass = styles.option;
              if (isReveal && isCorrect) optionClass = `${styles.option} ${styles.optionCorrect}`;
              else if (isReveal && isSelected && !isCorrect)
                optionClass = `${styles.option} ${styles.optionWrong}`;
              else if (isSelected) optionClass = `${styles.option} ${styles.optionSelected}`;

              return (
                <button
                  key={i}
                  type="button"
                  className={optionClass}
                  onClick={() => {
                    if (quiz.phase === "active" && !hasSubmitted) setSelectedAnswer(i);
                  }}
                  disabled={quiz.phase !== "active" || hasSubmitted}
                  aria-pressed={isSelected}
                >
                  <span className={styles.optionLetter}>{String.fromCharCode(65 + i)}</span>
                  <span className={styles.optionText}>{option}</span>
                  {isReveal && isCorrect && (
                    <CheckCircle2 size={18} className={styles.optionIcon} aria-hidden />
                  )}
                  {isReveal && isSelected && !isCorrect && (
                    <Circle size={18} className={styles.optionIcon} aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions / status */}
        {quiz.phase === "active" && (
          <div className={styles.actions}>
            {hasSubmitted ? (
              <p className={styles.submitted}>Answer submitted — waiting for results…</p>
            ) : (
              <Button
                variant="primary"
                size="lg"
                disabled={selectedAnswer === null}
                onClick={handleSubmit}
              >
                Submit Answer
              </Button>
            )}
          </div>
        )}

        {quiz.phase === "reveal_dist" && (
          <p className={styles.statusMsg}>Results incoming…</p>
        )}

        {quiz.phase === "reveal_correct" && quiz.why && (
          <div className={styles.explanation}>
            <p className={styles.explanationLabel}>Why?</p>
            <p className={styles.explanationText}>{quiz.why}</p>
          </div>
        )}

        {quiz.phase === "reveal_correct" && (
          <p className={styles.statusMsg}>
            {quiz.currentIndex + 1 < quiz.totalQuestions
              ? "Next question coming up…"
              : "Quiz complete — great job!"}
          </p>
        )}
      </div>
    </div>
  );
}
