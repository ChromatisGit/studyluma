"use client";

import type { QuizResultsDTO, QuizStateDTO } from "@schema/quizTypes";
import { QuizView } from "./QuizView";
import styles from "./QuizProjectorOverlay.module.css";
import slideStyles from "@features/slides/components/SlideRenderer.module.css";

type Props = {
  quizState: QuizResultsDTO | null;
};

/** Adapt the admin-facing QuizResultsDTO to the unified QuizStateDTO shape. */
function resultsToViewState(r: QuizResultsDTO): QuizStateDTO {
  return {
    sessionId: r.sessionId,
    courseId: r.courseId,
    // QuizResultsDTO.phase includes "closed"; cast is safe because the caller
    // never passes a closed session (overlay renders null for closed).
    phase: r.phase as QuizStateDTO["phase"],
    currentIndex: r.currentIndex,
    totalQuestions: r.totalQuestions,
    question: r.question,
    options: r.options,
    correctIndices: r.correctIndices,
    participants: r.participants,
    answeredCount: r.answeredCount,
    optionCounts: r.optionCounts,
    questionSummaries: r.questionSummaries,
    updatedAt: r.updatedAt,
  };
}

export function QuizProjectorOverlay({ quizState }: Props) {
  if (!quizState || quizState.phase === "closed") return null;

  return (
    <div className={styles.slide}>
      <div className={`${styles.cardWrap} ${slideStyles.contentBox} ${slideStyles.contentBoxFull}`}>
        <div className={slideStyles.slideHeader}>
          <h2 className={slideStyles.headerTitle}>Quiz</h2>
        </div>
        <div className={slideStyles.contentInner}>
          <QuizView mode="projector" quiz={resultsToViewState(quizState)} />
        </div>
      </div>
    </div>
  );
}
