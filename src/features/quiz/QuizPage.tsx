"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { joinQuizAction, submitQuizResponseAction } from "@actions/quizActions";
import type { QuizStateDTO } from "@schema/quizTypes";
import type { StudentStreamEvent, StudentSnapshot } from "@schema/streamTypes";
import { useQuizStream } from "./hooks/useQuizStream";
import { QuizView } from "./QuizView";
import styles from "./QuizPage.module.css";

type QuizPageProps = {
  initialState: QuizStateDTO | null;
};

export function QuizPage({ initialState }: QuizPageProps) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizStateDTO | null>(initialState);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const lastIndexRef = useRef<number | null>(initialState?.currentIndex ?? null);
  const lastSessionRef = useRef<string | null>(initialState?.sessionId ?? null);

  // Score tracking
  const [correctCount, setCorrectCount] = useState(0);
  const correctCountRef = useRef(0);
  const scoredQuestionRef = useRef(-1);

  // End-of-quiz redirect
  const wasActiveRef = useRef(!!initialState);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset per-question answer when the question index changes
  useEffect(() => {
    if (quiz && quiz.currentIndex !== lastIndexRef.current) {
      lastIndexRef.current = quiz.currentIndex;
      setSelectedAnswer(null);
    }
  }, [quiz]);

  // Join on mount if a session is already active (student arrived mid-quiz)
  useEffect(() => {
    if (initialState?.sessionId) {
      joinQuizAction(initialState.sessionId).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-join when a new session becomes available
  useEffect(() => {
    if (quiz?.sessionId && quiz.sessionId !== lastSessionRef.current) {
      lastSessionRef.current = quiz.sessionId;
      joinQuizAction(quiz.sessionId).catch(() => {});
    }
  }, [quiz?.sessionId]);

  // Accumulate score: increment once per question when correct answer is revealed
  useEffect(() => {
    if (
      quiz?.phase === "reveal_correct" &&
      quiz.correctIndices &&
      quiz.currentIndex !== scoredQuestionRef.current
    ) {
      scoredQuestionRef.current = quiz.currentIndex;
      if (selectedAnswer !== null && quiz.correctIndices.includes(selectedAnswer)) {
        correctCountRef.current += 1;
        setCorrectCount(correctCountRef.current);
      }
    }
  }, [quiz?.phase, quiz?.currentIndex, quiz?.correctIndices, selectedAnswer]);

  // Track whether a quiz was ever active
  useEffect(() => {
    if (quiz !== null) wasActiveRef.current = true;
  }, [quiz]);

  // When quiz closes, redirect to /plenum (future: teacher-controlled plenum state)
  useEffect(() => {
    if (quiz !== null || !wasActiveRef.current) return;
    wasActiveRef.current = false;
    redirectTimerRef.current = setTimeout(() => router.push("/"), 400);
  }, [quiz, router]);

  useEffect(() => {
    return () => { if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current); };
  }, []);

  // WebSocket: receive live quiz state
  const onEvent = useCallback((event: StudentStreamEvent) => {
    switch (event.type) {
      case "INIT": {
        const init = event as StudentSnapshot;
        setQuiz(init.quiz);
        break;
      }
      case "QUIZ_STATE":
        setQuiz((prev) => {
          const next = event.quiz;
          if (prev?.updatedAt && next?.updatedAt && next.updatedAt < prev.updatedAt) return prev;
          return next;
        });
        break;
      case "QUIZ_STARTED":
        break;
    }
  }, []);

  useQuizStream({ onEvent });

  const handleSelect = async (i: number) => {
    if (!quiz || quiz.phase !== "active") return;
    setSelectedAnswer(i);
    await submitQuizResponseAction(quiz.sessionId, quiz.currentIndex, [i]);
  };

  // ── No active quiz ──────────────────────────────────────────────────────
  if (!quiz) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <ClipboardList size={56} className={styles.emptyIcon} aria-hidden />
          <h1 className={styles.emptyTitle}>Kein Quiz aktiv</h1>
          <p className={styles.emptyDesc}>
            Dein Lehrer startet gleich ein Quiz — diese Seite aktualisiert sich automatisch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Question progress bar */}
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${((quiz.currentIndex + 1) / quiz.totalQuestions) * 100}%` }}
          />
        </div>

        {/* Shared quiz view */}
        <QuizView
          mode="student"
          quiz={quiz}
          selectedIndex={selectedAnswer}
          onSelect={handleSelect}
          correctCount={correctCount}
        />

        {/* Phase status hints */}
        {quiz.phase === "active" && selectedAnswer !== null && (
          <p className={styles.statusMsg}>Antwort gespeichert — du kannst sie noch ändern.</p>
        )}
        {quiz.phase === "reveal_dist" && (
          <p className={styles.statusMsg}>Auswertung folgt…</p>
        )}
        {quiz.phase === "reveal_correct" && quiz.currentIndex + 1 < quiz.totalQuestions && (
          <p className={styles.statusMsg}>Nächste Frage kommt…</p>
        )}
      </div>
    </div>
  );
}
