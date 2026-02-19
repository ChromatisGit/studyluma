"use client";

import clsx from "clsx";
import { useState } from "react";
import type { CSSProperties } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import type { McqMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import { useMacroValue } from "@macros/state/useMacroValue";
import { useMacroCheck } from "@macros/state/useMacroCheck";
import styles from "./styles.module.css";

type Props = MacroComponentProps<McqMacro>;
type CheckResult = "none" | "wrong" | "correct";

export default function McqRenderer({ macro, context }: Props) {
  const [selected, setSelected] = useMacroValue<string[]>(context.storageKey, []);
  const [checkResult, setCheckResult] = useState<CheckResult>("none");

  const isAttempted = selected.length > 0;
  const correctAnswers = macro.correct.map((c) => getMarkdown(c) ?? "");

  useMacroCheck(context, isAttempted, () => {
    const allCorrect =
      selected.length === correctAnswers.length &&
      correctAnswers.every((a) => selected.includes(a));
    setCheckResult(allCorrect ? "correct" : "wrong");
  });

  const question = getMarkdown(macro.question);
  const isSingleChoice = macro.single;
  const isDetailed = context.detailedFeedback ?? false;

  const handleSelect = (option: string) => {
    if (checkResult === "correct") return;
    if (isDetailed && checkResult !== "none") return;
    setCheckResult("none");
    if (macro.single) {
      setSelected([option]);
    } else {
      setSelected((prev) =>
        prev.includes(option)
          ? prev.filter((o) => o !== option)
          : [...prev, option]
      );
    }
  };

  const getOptionState = (optionText: string) => {
    const isSelected = selected.includes(optionText);
    const isCorrectAnswer = correctAnswers.includes(optionText);

    if (checkResult === "none") {
      return isSelected ? "active" : "default";
    }
    if (checkResult === "correct") {
      // Only correct answers were selectable and all are selected
      return isCorrectAnswer ? "correct" : "default";
    }
    // checkResult === "wrong"
    if (isDetailed) {
      if (isSelected && !isCorrectAnswer) return "wrong";
      if (!isSelected && isCorrectAnswer) return "missed";
      if (isSelected && isCorrectAnswer) return "correct";
      return "default";
    }
    // Formative mode: keep selection styling, no per-option feedback
    return isSelected ? "active" : "default";
  };

  return (
    <div className={styles.mcq}>
      {question && (
        <div className={styles.question}>
          <MarkdownRenderer markdown={question} />
        </div>
      )}

      <div className={styles.optionGridRow}>
        {!isDetailed && checkResult === "wrong" && (
          <div
            className={styles.wrongIndicator}
            title="Noch nicht ganz richtig — versuche es nochmal!"
          >
            <AlertCircle className={styles.wrongIcon} aria-hidden />
          </div>
        )}

        <div
          className={styles.optionGrid}
          style={{ "--columns": macro.wideLayout ? 2 : 4 } as CSSProperties}
        >
          {macro.options.map((option, i) => {
            const optionText = getMarkdown(option) ?? "";
            const state = getOptionState(optionText);
            const isSelected = selected.includes(optionText);

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(optionText)}
                disabled={checkResult === "correct" || (isDetailed && checkResult !== "none")}
                className={clsx(
                  styles.option,
                  styles[`option--${state}`],
                )}
              >
                <span
                  className={clsx(
                    styles.indicator,
                    styles[`indicator--${state}`],
                    isSingleChoice && styles.indicatorRadio,
                  )}
                >
                  {state === "correct" && (
                    isSingleChoice
                      ? <span className={styles.radioDot} />
                      : <Check className={styles.checkbox} />
                  )}
                  {state === "active" && (
                    isSingleChoice
                      ? <span className={styles.radioDot} />
                      : <X className={styles.checkbox} />
                  )}
                  {state === "wrong" && (
                    <X className={styles.checkbox} />
                  )}
                  {state === "missed" && isSelected && (
                    isSingleChoice
                      ? <span className={styles.radioDot} />
                      : <X className={styles.checkbox} />
                  )}
                </span>
                <span className={styles.optionText}>
                  <MarkdownRenderer markdown={optionText} />
                </span>
                {isDetailed && state === "wrong" && (
                  <X className={styles.resultIcon} aria-hidden />
                )}
                {isDetailed && state === "missed" && (
                  <Check className={styles.resultIcon} aria-hidden />
                )}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
