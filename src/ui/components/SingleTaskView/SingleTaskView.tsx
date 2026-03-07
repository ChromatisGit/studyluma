"use client";

import clsx from "clsx";
import { useState, useEffect, useCallback } from "react";
import { Check } from "lucide-react";
import { renderInlineMarkdown } from "@ui/lib/renderInlineMarkdown";
import styles from "./styles.module.css";

export type SingleTaskPhase =
  | "active"          // timer running (or no timer), student can select + submit
  | "waiting"         // before timer starts (options visible, submit disabled)
  | "reveal_dist"     // distribution shown, correct not highlighted
  | "reveal_correct"; // correct answer highlighted + #why shown

type TimerInfo = {
  endsAt: Date;
  totalSeconds: number;
};

export type SingleTaskViewProps = {
  question: string;
  options: string[];
  phase: SingleTaskPhase;
  single: boolean;
  onSubmit: (selectedIndices: number[]) => void;
  timer?: TimerInfo;
  /** Shown in reveal_dist and reveal_correct phases */
  optionCounts?: number[];
  totalParticipants?: number;
  /** Shown only in reveal_correct phase */
  correctIndices?: number[];
  why?: string;
  /** True after the student has already submitted */
  hasSubmitted?: boolean;
};

export function SingleTaskView({
  question,
  options,
  phase,
  single,
  onSubmit,
  timer,
  optionCounts,
  totalParticipants,
  correctIndices,
  why,
  hasSubmitted = false,
}: SingleTaskViewProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (!timer || phase !== "active") {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((timer.endsAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) setTimedOut(true);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timer, phase]);

  const canSelect = phase === "active" && !hasSubmitted && !timedOut;
  const canSubmit = canSelect && selected.length > 0;

  const handleToggle = useCallback(
    (idx: number) => {
      if (!canSelect) return;
      setSelected((prev) => {
        if (single) return prev[0] === idx ? [] : [idx];
        return prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx];
      });
    },
    [canSelect, single]
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit(selected);
  }, [canSubmit, onSubmit, selected]);

  const isReveal = phase === "reveal_dist" || phase === "reveal_correct";
  const maxCount = optionCounts ? Math.max(1, ...optionCounts) : 1;

  const timerProgress =
    timer && secondsLeft !== null
      ? Math.max(0, secondsLeft / timer.totalSeconds)
      : null;

  return (
    <div className={styles.root}>
      {/* Timer bar */}
      {timer && phase === "active" && timerProgress !== null && (
        <div className={styles.timerBar}>
          <div
            className={clsx(styles.timerFill, secondsLeft !== null && secondsLeft <= 5 && styles.timerUrgent)}
            style={{ width: `${timerProgress * 100}%` }}
          />
        </div>
      )}

      {/* Timer seconds display */}
      {timer && phase === "active" && secondsLeft !== null && (
        <div className={clsx(styles.timerCount, secondsLeft <= 5 && styles.timerCountUrgent)}>
          {secondsLeft}
        </div>
      )}

      {/* Question */}
      <div className={styles.question}>
        {renderInlineMarkdown(question)}
      </div>

      {/* Options */}
      <div className={styles.options}>
        {options.map((option, idx) => {
          const isSelected = selected.includes(idx);
          const isCorrect = correctIndices?.includes(idx);
          const count = optionCounts?.[idx] ?? 0;
          const barWidth = isReveal ? (count / maxCount) * 100 : 0;

          let optionState: "default" | "selected" | "correct" | "incorrect" | "neutral" = "default";
          if (isReveal) {
            if (phase === "reveal_correct") {
              optionState = isCorrect ? "correct" : "neutral";
            } else {
              optionState = "neutral";
            }
          } else if (isSelected) {
            optionState = "selected";
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleToggle(idx)}
              disabled={!canSelect}
              className={clsx(
                styles.option,
                styles[`option--${optionState}`],
                isReveal && styles.optionReveal,
              )}
            >
              {/* Distribution bar (behind content) */}
              {isReveal && (
                <span
                  className={clsx(
                    styles.bar,
                    phase === "reveal_correct" && isCorrect && styles.barCorrect,
                  )}
                  style={{ width: `${barWidth}%` }}
                  aria-hidden
                />
              )}

              {/* Option indicator (letter A, B, C...) */}
              <span className={clsx(styles.indicator, styles[`indicator--${optionState}`])}>
                {phase === "reveal_correct" && isCorrect ? (
                  <Check size={14} aria-hidden />
                ) : (
                  <span className={styles.optionLetter}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                )}
              </span>

              <span className={styles.optionText}>
                {renderInlineMarkdown(option)}
              </span>

              {/* Count badge in reveal phases */}
              {isReveal && totalParticipants !== undefined && (
                <span className={styles.countBadge}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Submit button (active phase, not yet submitted) */}
      {phase === "active" && !hasSubmitted && !timedOut && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={clsx(styles.submitBtn, canSubmit && styles.submitBtnReady)}
        >
          Antwort abschicken
        </button>
      )}

      {/* Waiting / submitted state */}
      {phase === "active" && (hasSubmitted || timedOut) && (
        <div className={styles.waitingState}>
          {timedOut && !hasSubmitted ? "Zeit abgelaufen" : "Gesendet — warte auf Auswertung…"}
        </div>
      )}

      {phase === "waiting" && (
        <div className={styles.waitingState}>Quiz startet gleich…</div>
      )}

      {/* #why explanation */}
      {phase === "reveal_correct" && why && (
        <div className={styles.why}>
          <span className={styles.whyLabel}>Erklärung</span>
          <p className={styles.whyText}>{renderInlineMarkdown(why)}</p>
        </div>
      )}
    </div>
  );
}
