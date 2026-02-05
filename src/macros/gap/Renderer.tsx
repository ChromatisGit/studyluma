"use client";

import clsx from "clsx";
import { useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import type { GapMacro, GapField as GapFieldType } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { useWorksheetStorage } from "@features/contentpage/storage/WorksheetStorageContext";
import { getMarkdown } from "@macros/markdownParser";
import {
  GapMarkdownRenderer,
  GapRenderProvider,
} from "@features/contentpage/components/MarkdownRenderer/GapMarkdownRenderer";
import styles from "./styles.module.css";
import MACROS_TEXT from "@macros/macros.de.json";

type Props = MacroComponentProps<GapMacro>;

export default function GapRenderer({ macro, context }: Props) {
  const storage = useWorksheetStorage();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checkedGaps, setCheckedGaps] = useState<Record<number, boolean>>({});

  const gapCount = macro.gaps.length;

  // Load persisted state
  useEffect(() => {
    if (context.persistState && context.storageKey && storage) {
      const saved = storage.readResponse(context.storageKey);
      if (saved) {
        try {
          setAnswers(JSON.parse(saved));
        } catch {
          // Invalid saved data
        }
      }
    }
  }, [context.persistState, context.storageKey, storage]);

  // Save state when it changes
  useEffect(() => {
    if (context.persistState && context.storageKey && storage && Object.keys(answers).length > 0) {
      storage.saveResponse(context.storageKey, JSON.stringify(answers));
    }
  }, [context.persistState, context.storageKey, storage, answers]);

  // Check if task was attempted (at least one gap filled)
  const wasAttempted = Object.values(answers).some((a) => a.length > 0);

  // Respond to check trigger - only if task was attempted
  useEffect(() => {
    if (context.checkTrigger && context.checkTrigger > 0 && wasAttempted) {
      const nextChecked: Record<number, boolean> = {};
      for (let index = 0; index < gapCount; index += 1) {
        nextChecked[index] = true;
      }
      setCheckedGaps(nextChecked);
    }
  }, [context.checkTrigger, gapCount, wasAttempted]);

  const handleChange = (gapIndex: number, value: string) => {
    setCheckedGaps((prev) => ({ ...prev, [gapIndex]: false }));
    setAnswers((prev) => ({ ...prev, [gapIndex]: value }));
  };

  const renderGap = useCallback(
    (gapIndex: number, isInCodeBlock: boolean) => {
      const gap = macro.gaps[gapIndex];
      if (!gap) return null;

      const answer = answers[gapIndex] ?? "";
      const valueToCompare =
        gap.mode === "text"
          ? isInCodeBlock
            ? answer.trim()
            : answer.toLowerCase().trim()
          : answer;
      const correctOptions =
        gap.mode === "text"
          ? isInCodeBlock
            ? gap.correct
            : gap.correct.map((o) => o.toLowerCase())
          : gap.correct;
      const isCorrect = correctOptions.includes(valueToCompare);
      const isGapChecked = checkedGaps[gapIndex] ?? false;

      return (
        <GapField
          gap={gap}
          value={answer}
          onChange={(value) => handleChange(gapIndex, value)}
          isInCodeBlock={isInCodeBlock}
          isChecked={isGapChecked}
          isCorrect={isCorrect}
        />
      );
    },
    [macro.gaps, answers, checkedGaps]
  );

  const markdown = getMarkdown(macro.content) ?? "";

  return (
    <GapRenderProvider renderGap={renderGap}>
      <div className={styles.gap}>
        <GapMarkdownRenderer markdown={markdown} />
      </div>
    </GapRenderProvider>
  );
}

interface GapFieldProps {
  gap: GapFieldType;
  value: string;
  onChange: (value: string) => void;
  isInCodeBlock?: boolean;
  isChecked?: boolean;
  isCorrect?: boolean;
}

function GapField({ gap, value, onChange, isInCodeBlock = false, isChecked = false, isCorrect }: GapFieldProps) {
  const options = gap.options ?? gap.correct;
  const longestText = options.reduce<string>(
    (longest, option) => (option.length > longest.length ? option : longest),
    ""
  );

  const baseWidth = Math.max(longestText.length * 0.71, 1.45);
  const inputWidth = gap.mode === "mcq" ? `${baseWidth + 1.1}rem` : `${baseWidth}rem`;
  const widthStyle = { width: inputWidth, minWidth: inputWidth };

  // Determine validation state
  const showWrong = isChecked && value && !isCorrect;
  const showCorrect = isChecked && isCorrect;

  const stateClass = showWrong
    ? styles.gapWrong
    : showCorrect
      ? styles.gapCorrect
      : styles.gapActive;

  if (gap.mode === "text") {
    return (
      <span
        className={clsx(styles.gapField, isInCodeBlock && styles.gapInCode, stateClass)}
        style={widthStyle}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.gapControl}
          placeholder={MACROS_TEXT.gap.textPlaceholder}
        />
      </span>
    );
  }

  // MCQ mode - dropdown
  return (
    <span
      className={clsx(styles.gapField, isInCodeBlock && styles.gapInCode, stateClass)}
      style={widthStyle}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(styles.gapControl, styles.gapSelect)}
      >
        <option value="" disabled hidden />
        {options.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className={styles.gapChevron} />
    </span>
  );
}
