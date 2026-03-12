"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, Circle } from "lucide-react";
import type { QuizStateDTO } from "@schema/quizTypes";
import { renderInlineMarkdown } from "@ui/lib/renderInlineMarkdown";
import styles from "./QuizView.module.css";

export type QuizViewMode = "student" | "projector";

type Props = {
  mode: QuizViewMode;
  quiz: QuizStateDTO;
  /** Student only: which option the student has selected */
  selectedIndex?: number | null;
  /** Student only: called when the student selects an option */
  onSelect?: (index: number) => void;
  /** Student only: personal correct count for the summary screen */
  correctCount?: number;
};

export function QuizView({ mode, quiz, selectedIndex, onSelect, correctCount = 0 }: Props) {
  const { phase, question, options, correctIndices, optionCounts, answeredCount, participants } = quiz;
  const isStudent = mode === "student";

  // ── Staged answer reveal ──────────────────────────────────────────────────
  // Options fade in with a stagger, and only become interactive after the
  // last option has settled. This nudges students to read before clicking.
  const [optionsReady, setOptionsReady] = useState(false);
  const prevIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "active" || mode === "projector") {
      setOptionsReady(true);
      return;
    }
    if (quiz.currentIndex !== prevIndexRef.current) {
      prevIndexRef.current = quiz.currentIndex;
      setOptionsReady(false);
      // Delay = stagger per option + small settle buffer
      const delay = options.length * 90 + 120;
      const id = setTimeout(() => setOptionsReady(true), delay);
      return () => clearTimeout(id);
    }
  }, [phase, quiz.currentIndex, options.length, mode]);

  // ── Bar chart: animate from 0 on phase entry ──────────────────────────────
  const [barsReady, setBarsReady] = useState(false);
  const prevPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    const isReveal = phase === "reveal_dist" || phase === "reveal_correct" || phase === "summary";
    if (isReveal && phase !== prevPhaseRef.current) {
      prevPhaseRef.current = phase;
      setBarsReady(false);
      const id = requestAnimationFrame(() => setBarsReady(true));
      return () => cancelAnimationFrame(id);
    }
    if (!isReveal) {
      prevPhaseRef.current = phase;
      setBarsReady(false);
    }
  }, [phase]);

  // ── Waiting ───────────────────────────────────────────────────────────────
  if (phase === "waiting") {
    return (
      <div className={styles.waitingWrap}>
        <div className={styles.waitingBody}>
          <p className={styles.waitingTitle}>Das Quiz startet gleich</p>
          <div className={styles.waitingPulse}>
            <span className={styles.pulseDot} />
          </div>
          <p className={styles.waitingSubtitle}>Warte noch auf weitere Teilnehmer</p>
          {participants != null && participants > 0 && (
            <p className={styles.participantCount}>{participants} dabei</p>
          )}
        </div>
      </div>
    );
  }

  // ── Active ────────────────────────────────────────────────────────────────
  if (phase === "active") {
    const showProgress = mode === "projector" && participants != null && participants > 0;
    return (
      <div className={styles.activeWrap}>
        <p className={styles.questionMeta}>
          Frage {quiz.currentIndex + 1} / {quiz.totalQuestions}
        </p>
        <div className={styles.questionText}>{renderInlineMarkdown(question)}</div>
        <div className={styles.optionList}>
          {options.map((opt, i) => {
            const isSelected = selectedIndex === i;
            let cls = styles.option;
            if (isSelected) cls = `${styles.option} ${styles.optionSelected}`;
            return (
              <button
                key={i}
                type="button"
                className={cls}
                style={{ animationDelay: `${i * 90}ms` }}
                data-ready={String(optionsReady)}
                onClick={isStudent && optionsReady ? () => onSelect?.(i) : undefined}
                disabled={!isStudent || !optionsReady}
                aria-pressed={isSelected}
              >
                <span className={styles.optionBadge}>{String.fromCharCode(65 + i)}</span>
                <span className={styles.optionText}>{renderInlineMarkdown(opt)}</span>
                {isSelected && <span className={styles.optionCheck}>✓</span>}
              </button>
            );
          })}
        </div>
        {showProgress && (
          <div className={styles.progressRow}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.round(((answeredCount ?? 0) / participants!) * 100)}%` }}
              />
            </div>
            <span className={styles.progressLabel}>
              {answeredCount ?? 0} / {participants}
            </span>
          </div>
        )}
      </div>
    );
  }

  // ── Reveal (dist + correct) ───────────────────────────────────────────────
  if (phase === "reveal_dist" || phase === "reveal_correct") {
    const counts = optionCounts ?? [];
    const total = answeredCount ?? 0;
    const maxCount = Math.max(1, ...counts);

    return (
      <div className={styles.revealWrap}>
        <p className={styles.questionMeta}>
          Frage {quiz.currentIndex + 1} / {quiz.totalQuestions}
        </p>
        <div className={styles.questionText}>{renderInlineMarkdown(question)}</div>
        <div className={styles.barList}>
          {options.map((opt, i) => {
            const isCorrect = phase === "reveal_correct" && correctIndices?.includes(i);
            const isSelected = selectedIndex === i;
            const pct = Math.round(total > 0 ? (counts[i] / total) * 100 : 0);
            const barWidth = barsReady ? `${(counts[i] / maxCount) * 100}%` : "0%";

            return (
              <div
                key={i}
                className={[
                  styles.barRow,
                  phase === "reveal_correct" && isCorrect ? styles.barRowCorrect : "",
                  phase === "reveal_correct" && !isCorrect ? styles.barRowNeutral : "",
                ].join(" ").trim()}
              >
                <div className={styles.barLabel}>
                  {phase === "reveal_correct" && isCorrect ? (
                    <Check size={20} className={styles.checkIcon} aria-label="Richtig" />
                  ) : (
                    <span className={styles.barLetter}>{String.fromCharCode(65 + i)}</span>
                  )}
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${isCorrect ? styles.barFillCorrect : ""}`}
                    style={{ width: barWidth }}
                  />
                  <span className={styles.barOptionText}>{renderInlineMarkdown(opt)}</span>
                </div>
                <span className={styles.barPct}>{pct}%</span>
                {isStudent && isSelected && (
                  <span className={styles.barPersonal}>
                    {phase === "reveal_correct" ? (
                      isCorrect
                        ? <CheckCircle2 size={16} className={styles.personalCorrect} />
                        : <Circle size={16} className={styles.personalWrong} />
                    ) : (
                      <span className={styles.personalDot} />
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  if (phase === "summary") {
    const summaries = quiz.questionSummaries ?? [];
    const total = quiz.totalQuestions;

    if (isStudent) {
      const scorePct = total > 0 ? correctCount / total : 0;
      const scoreMessage =
        scorePct === 1
          ? "Alles richtig!"
          : scorePct >= 0.75
            ? "Sehr gut gemacht!"
            : scorePct >= 0.5
              ? "Gut gemacht!"
              : "Weiter üben!";

      return (
        <div className={styles.summaryWrap}>
          <div className={styles.summaryScore}>
            <p className={styles.summaryFraction}>
              {correctCount} / {total}
            </p>
            <p className={styles.summarySubLabel}>richtig beantwortet</p>
            <p className={styles.summaryMessage}>{scoreMessage}</p>
          </div>
          {summaries.length > 0 && (
            <div className={styles.summaryList}>
              {summaries.map((s) => {
                const counts = s.optionCounts;
                const totalAns = counts.reduce((a, b) => a + b, 0);
                const maxC = Math.max(1, ...counts);
                return (
                  <div key={s.questionIndex} className={styles.summaryItem}>
                    <p className={styles.summaryItemQuestion}>
                      <span className={styles.summaryItemIndex}>{s.questionIndex + 1}</span>
                      {renderInlineMarkdown(s.question)}
                    </p>
                    <div className={styles.summaryMiniBar}>
                      {s.options.map((opt, i) => {
                        const isC = s.correctIndices.includes(i);
                        const pct = Math.round(totalAns > 0 ? (counts[i] / totalAns) * 100 : 0);
                        const fillW = barsReady ? `${(counts[i] / maxC) * 100}%` : "0%";
                        return (
                          <div key={i} className={`${styles.miniBarRow} ${isC ? styles.miniBarCorrect : ""}`}>
                            <span className={styles.miniBarLetter}>{String.fromCharCode(65 + i)}</span>
                            <div className={styles.miniBarTrack}>
                              <div className={`${styles.miniBarFill} ${isC ? styles.miniBarFillCorrect : ""}`} style={{ width: fillW }} />
                              <span className={styles.miniBarText}>{renderInlineMarkdown(opt)}</span>
                            </div>
                            <span className={styles.miniBarPct}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Projector summary: class-level aggregate
    return (
      <div className={styles.summaryWrap}>
        <p className={styles.summaryProjectorTitle}>Ergebnisse</p>
        <div className={styles.summaryList}>
          {summaries.map((s) => {
            const counts = s.optionCounts;
            const totalAns = counts.reduce((a, b) => a + b, 0);
            const maxC = Math.max(1, ...counts);
            return (
              <div key={s.questionIndex} className={styles.summaryItem}>
                <p className={styles.summaryItemQuestion}>
                  <span className={styles.summaryItemIndex}>{s.questionIndex + 1}</span>
                  {renderInlineMarkdown(s.question)}
                  <span className={styles.summaryItemPct}>{s.percentCorrect}% richtig</span>
                </p>
                <div className={styles.summaryMiniBar}>
                  {s.options.map((opt, i) => {
                    const isC = s.correctIndices.includes(i);
                    const pct = Math.round(totalAns > 0 ? (counts[i] / totalAns) * 100 : 0);
                    const fillW = barsReady ? `${(counts[i] / maxC) * 100}%` : "0%";
                    return (
                      <div key={i} className={`${styles.miniBarRow} ${isC ? styles.miniBarCorrect : ""}`}>
                        <span className={styles.miniBarLetter}>{String.fromCharCode(65 + i)}</span>
                        <div className={styles.miniBarTrack}>
                          <div className={`${styles.miniBarFill} ${isC ? styles.miniBarFillCorrect : ""}`} style={{ width: fillW }} />
                          <span className={styles.miniBarText}>{renderInlineMarkdown(opt)}</span>
                        </div>
                        <span className={styles.miniBarPct}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
