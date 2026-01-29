"use client";

import clsx from "clsx";
import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import type { McqMacro as McqMacroType } from "@schema/macroTypes";
import type { MacroComponentProps } from "@features/contentpage/macros/types";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@features/contentpage/utils/textUtils";
import { useWorksheetStorage } from "@features/contentpage/storage/WorksheetStorageContext";
import styles from "./McqMacro.module.css";

type Props = MacroComponentProps<McqMacroType>;
type OptionState = "default" | "active" | "correct" | "wrong" | "missed";

export function McqMacro({ macro, context }: Props) {
  const storage = useWorksheetStorage();
  const [selected, setSelected] = useState<string[]>([]);
  const [isChecked, setIsChecked] = useState(false);

  // Load persisted state
  useEffect(() => {
    if (context.persistState && context.storageKey && storage) {
      const saved = storage.readResponse(context.storageKey);
      if (saved) {
        try {
          setSelected(JSON.parse(saved));
        } catch {
          // Invalid saved data
        }
      }
    }
  }, [context.persistState, context.storageKey, storage]);

  // Save state when it changes
  useEffect(() => {
    if (context.persistState && context.storageKey && storage && selected.length > 0) {
      storage.saveResponse(context.storageKey, JSON.stringify(selected));
    }
  }, [context.persistState, context.storageKey, storage, selected]);

  // Respond to check trigger
  useEffect(() => {
    if (context.checkTrigger && context.checkTrigger > 0) {
      setIsChecked(true);
    }
  }, [context.checkTrigger]);

  const question = getMarkdown(macro.question);
  const correctAnswers = macro.correct.map((c) => getMarkdown(c) ?? "");

  const handleSelect = (option: string) => {
    if (isChecked) return;

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

  const getOptionState = (optionText: string): OptionState => {
    const isSelected = selected.includes(optionText);
    const isCorrect = correctAnswers.includes(optionText);

    if (!isChecked) {
      return isSelected ? "active" : "default";
    }

    if (isSelected && isCorrect) return "correct";
    if (isSelected && !isCorrect) return "wrong";
    if (!isSelected && isCorrect) return "missed";
    return "default";
  };

  const isSingleChoice = macro.single;

  return (
    <div className={styles.mcq}>
      {question && (
        <div className={styles.question}>
          <MarkdownRenderer markdown={question} />
        </div>
      )}

      <div
        className={styles.optionGrid}
        style={{ "--columns": macro.wideLayout ? 2 : 4 } as React.CSSProperties}
      >
        {macro.options.map((option, i) => {
          const optionText = getMarkdown(option) ?? "";
          const state = getOptionState(optionText);
          const isSelected = selected.includes(optionText);
          const indicatorState = isSelected ? "active" : "default";
          const showIndicatorContent = isSelected;
          const showResultIcon =
            isChecked && (state === "correct" || state === "wrong" || state === "missed");

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(optionText)}
              disabled={isChecked}
              className={clsx(styles.option, styles[`option--${state}`])}
            >
              <span className={clsx(styles.indicator, styles[`indicator--${indicatorState}`], isSingleChoice && styles.indicatorRadio)}>
                {showIndicatorContent && (
                  isSingleChoice
                    ? <span className={styles.radioDot} />
                    : <X className={styles.checkbox} />
                )}
              </span>
              <span className={styles.optionText}>
                <MarkdownRenderer markdown={optionText} />
              </span>
              <span className={styles.resultIcon}>
                {showResultIcon && (
                  <>
                    {state === "correct" && <Check className={styles.resultIconSvg} />}
                    {state === "wrong" && <X className={styles.resultIconSvg} />}
                    {state === "missed" && <Check className={styles.resultIconSvg} />}
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
