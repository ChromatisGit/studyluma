"use client";

import clsx from "clsx";
import { Check, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";


import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { chunkBySize, chunkPrefer3Or4 } from "@lib/arrays";
import { useTaskPersistence } from "@features/contentpage/storage/useTaskPersistence";
import sharedStyles from "@features/contentpage/styles/shared.module.css";
import type { McqMacro } from "@domain/macroTypes";
import { getMarkdown } from "@features/contentpage/utils/textUtils";
import styles from "./McqTask.module.css";

interface McqTaskProps {
  task: McqMacro;
  isSingleTask?: boolean;
  triggerCheck: number;
  taskKey: string;
}

export function McqTask({ task, isSingleTask = false, triggerCheck, taskKey }: McqTaskProps) {
  const { value: selected, setValue: setSelected, worksheetId } = useTaskPersistence<string[]>(taskKey, []);
  const [isChecked, setIsChecked] = useState(false);
  const lastHandledCheckRef = useRef(0);
  const isSingleChoice = task.single;
  const groupName = useId();
  const questionText = getMarkdown(task.question) ?? "";
  const options = (task.options ?? [])
    .map((option) => getMarkdown(option))
    .filter((option): option is string => Boolean(option));
  const correctOptions = (task.correct ?? [])
    .map((option) => getMarkdown(option))
    .filter((option): option is string => Boolean(option));

  useEffect(() => {
    if (triggerCheck === lastHandledCheckRef.current) return;
    lastHandledCheckRef.current = triggerCheck;

    if (triggerCheck > 0 && selected.length > 0) {
      setIsChecked(true);
    }
  }, [selected.length, triggerCheck]);

  useEffect(() => {
    setIsChecked(false);
    lastHandledCheckRef.current = 0;
  }, [worksheetId]);

  const isLocked = isChecked;
  const optionRows = task.wideLayout ? chunkBySize(options, 2) : chunkPrefer3Or4(options);

  const handleSelect = (option: string) => {
    if (isLocked) return;

    if (isSingleChoice) {
      setSelected([option]);
    } else {
      setSelected((prev) =>
        prev.includes(option) ? prev.filter((entry) => entry !== option) : [...prev, option]
      );
    }
  };

  const getOptionStyles = (option: string, isSelected: boolean) => {
    const isCorrect = correctOptions.includes(option);
    const showWrong = isLocked && isSelected && !isCorrect;
    const showCorrect = isLocked && isCorrect && isSelected;
    const showMissed = isLocked && isCorrect && !isSelected;

    return {
      className: clsx(
        styles.optionCard,
        !isLocked && styles.optionInteractive,
        showWrong
          ? styles.optionStateWrong
          : showCorrect
            ? styles.optionStateCorrect
            : showMissed
              ? styles.optionStateMissed
              : isSelected
                ? styles.optionStateActive
                : null,
        isLocked && styles.optionLocked
      ),
      showWrong,
      showCorrect,
      showMissed,
    };
  };

  return (
    <div className={clsx(sharedStyles.stackMedium, isSingleTask && sharedStyles.stackTight)}>
      <div className={sharedStyles.bodyText}>
        <MarkdownRenderer markdown={questionText} />
      </div>

      <div className={styles.optionGrid}>
        {optionRows.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className={styles.optionRow}
            style={{ "--columns": row.length } as CSSProperties}
          >
            {row.map((option, optionIndex) => {
              const isSelected = selected.includes(option);
              const optionStyles = getOptionStyles(option, isSelected);

              return (
                <label
                  key={`${option}-${rowIndex}-${optionIndex}`}
                  className={optionStyles.className}
                >
                  <input
                    type={isSingleChoice ? "radio" : "checkbox"}
                    name={isSingleChoice ? groupName : undefined}
                    checked={isSelected}
                    onChange={() => handleSelect(option)}
                    disabled={isLocked}
                    className={styles.optionInput}
                  />
                  <span className={styles.optionLabel}>
                    {option}
                  </span>
                  {optionStyles.showCorrect && <Check className={styles.optionIcon} aria-hidden />}
                  {optionStyles.showWrong && <X className={styles.optionIcon} aria-hidden />}
                  {optionStyles.showMissed && <Check className={styles.optionIcon} aria-hidden />}
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
