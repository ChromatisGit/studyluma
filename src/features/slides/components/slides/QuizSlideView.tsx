import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import type { QuizSlide } from "@schema/slideTypes";
import { SlideHeader } from "./SlideHeader";
import styles from "./slide.module.css";

const LETTERS = ["A", "B", "C", "D", "E"];

type Props = { slide: QuizSlide; projector?: boolean };

export function QuizSlideView({ slide, projector }: Props) {
  if (projector) {
    return (
      <>
        <SlideHeader title={slide.header} badge="Quiz" accent="teal" />
        <div className={styles.quizPlaceholder}>
          <span className={styles.quizPlaceholderIcon}>🎯</span>
          <span className={styles.quizPlaceholderText}>Bereit?</span>
        </div>
      </>
    );
  }

  return (
    <>
      <SlideHeader title={slide.header} badge="Quiz" accent="teal" />
      <div style={{ padding: "var(--sn-space-md) var(--sn-space-xl)", flex: 1, display: "flex", flexDirection: "column", gap: "var(--sn-space-md)", overflowY: "auto" }}>
        {slide.questions.map((q, qi) => (
          <div key={qi} className={styles.quizQuestion}>
            <div className={styles.quizQuestionText}>
              <MarkdownRenderer markdown={q.question} />
            </div>
            <div className={styles.quizOptions}>
              {q.options.map((opt, oi) => (
                <div key={oi} className={styles.quizOption}>
                  <span
                    className={`${styles.quizOptionBadge} ${opt.correct ? styles.quizOptionBadgeCorrect : styles.quizOptionBadgeWrong}`}
                  >
                    {LETTERS[oi] ?? oi + 1}
                  </span>
                  <span
                    className={`${styles.quizOptionText} ${opt.correct ? styles.quizOptionTextCorrect : ""}`}
                  >
                    <MarkdownRenderer markdown={opt.text} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
