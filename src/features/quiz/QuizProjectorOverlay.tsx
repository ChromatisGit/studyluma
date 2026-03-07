"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import type { QuizResultsDTO } from "@schema/quizTypes";
import { renderInlineMarkdown } from "@ui/lib/renderInlineMarkdown";
import styles from "./QuizProjectorOverlay.module.css";

type Props = {
  channelName: string;
};

export function QuizProjectorOverlay({ channelName }: Props) {
  const [results, setResults] = useState<QuizResultsDTO | null>(null);

  useEffect(() => {
    let active = true;
    let lastModified: string | null = null;

    const poll = async () => {
      if (!active) return;
      try {
        const headers: Record<string, string> = {};
        if (lastModified) headers["If-Modified-Since"] = lastModified;

        const res = await fetch(`/api/quiz/channel/${encodeURIComponent(channelName)}/results`, {
          headers,
        });

        if (res.status === 304) {
          // unchanged
        } else if (res.status === 410 || res.status === 404) {
          setResults(null);
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
  }, [channelName]);

  if (!results) return null;

  const { phase, question, options, correctIndices, why, participants, answeredCount, optionCounts } = results;
  const maxCount = Math.max(1, ...optionCounts);

  // ── Waiting phase — keep projector blank until question goes live ──────────
  if (phase === "waiting") {
    return null;
  }

  // ── Active phase ───────────────────────────────────────────────────────────
  if (phase === "active") {
    return (
      <div className={styles.overlay}>
        <div className={styles.activeCard}>
          <div className={styles.questionText}>{renderInlineMarkdown(question)}</div>
          <div className={styles.activeOptions}>
            {options.map((opt, i) => (
              <div key={i} className={styles.activeOption}>
                <span className={styles.optionBadge}>{String.fromCharCode(65 + i)}</span>
                <span>{renderInlineMarkdown(opt)}</span>
              </div>
            ))}
          </div>
          <div className={styles.progressRow}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: participants > 0 ? `${(answeredCount / participants) * 100}%` : "0%" }}
              />
            </div>
            <span className={styles.progressLabel}>
              {answeredCount} / {participants}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── reveal_dist / reveal_correct ───────────────────────────────────────────
  if (phase === "reveal_dist" || phase === "reveal_correct") {
    return (
      <div className={styles.overlay}>
        <div className={styles.revealCard}>
          <div className={styles.questionText}>{renderInlineMarkdown(question)}</div>

          <div className={styles.bars}>
            {options.map((opt, i) => {
              const isCorrect = phase === "reveal_correct" && correctIndices.includes(i);
              const barPct = (optionCounts[i] / maxCount) * 100;
              const label = `${Math.round(participants > 0 ? (optionCounts[i] / participants) * 100 : 0)}%`;

              return (
                <div
                  key={i}
                  className={`${styles.barRow} ${phase === "reveal_correct" && isCorrect ? styles.barRowCorrect : ""} ${phase === "reveal_correct" && !isCorrect ? styles.barRowNeutral : ""}`}
                >
                  <div className={styles.barLabel}>
                    {phase === "reveal_correct" && isCorrect ? (
                      <Check size={16} className={styles.checkIcon} aria-label="Richtig" />
                    ) : (
                      <span className={styles.optionLetter}>{String.fromCharCode(65 + i)}</span>
                    )}
                  </div>
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${isCorrect ? styles.barFillCorrect : ""}`}
                      style={{ width: `${barPct}%` }}
                    />
                    <span className={styles.barOptionText}>{renderInlineMarkdown(opt)}</span>
                  </div>
                  <span className={styles.barPct}>{label}</span>
                </div>
              );
            })}
          </div>

          {phase === "reveal_correct" && why && (
            <div className={styles.why}>
              <span className={styles.whyLabel}>Erklärung</span>
              <p className={styles.whyText}>{renderInlineMarkdown(why)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
