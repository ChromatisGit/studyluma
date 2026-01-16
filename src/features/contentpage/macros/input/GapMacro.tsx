"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Highlight } from "prism-react-renderer";
import { codeTheme } from "@features/contentpage/components/MarkdownRenderer/codeTheme";
import type { GapMacro as GapMacroType, GapField as GapFieldType } from "@domain/macroTypes";
import type { MacroComponentProps } from "../types";
import { useWorksheetStorage } from "../../storage/WorksheetStorageContext";
import styles from "./GapMacro.module.css";

type Props = MacroComponentProps<GapMacroType>;

export function GapMacro({ macro, context }: Props) {
  const storage = useWorksheetStorage();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isChecked, setIsChecked] = useState(false);

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

  // Respond to check trigger
  useEffect(() => {
    if (context.checkTrigger && context.checkTrigger > 0) {
      setIsChecked(true);
    }
  }, [context.checkTrigger]);

  const handleChange = (gapIndex: number, value: string) => {
    if (isChecked) return;
    setAnswers((prev) => ({ ...prev, [gapIndex]: value }));
  };

  let gapCounter = 0;

  // Process parts to handle code blocks properly
  const renderParts = () => {
    const elements: ReactNode[] = [];
    let isInCodeBlock = false;
    let codeBlockContent: ReactNode[] = [];
    let currentLineContent: ReactNode[] = [];
    let lineKey = 0;

    const flushLine = () => {
      if (currentLineContent.length === 0) return;

      const lineKeyVal = lineKey++;
      const fragments = currentLineContent;
      currentLineContent = [];

      codeBlockContent.push(
        <div key={`line-${lineKeyVal}`}>
          {fragments.map((frag, fragIndex) => {
            if (typeof frag === "string") {
              return (
                <Highlight
                  key={fragIndex}
                  theme={codeTheme}
                  code={frag}
                  language="tsx"
                >
                  {({ tokens, getTokenProps }) =>
                    tokens[0]?.map((token, tokenIndex) => (
                      <span
                        key={tokenIndex}
                        {...(getTokenProps({ token }) as React.HTMLAttributes<HTMLSpanElement>)}
                      />
                    ))
                  }
                </Highlight>
              );
            }
            return <span key={fragIndex}>{frag}</span>;
          })}
        </div>
      );
    };

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        elements.push(
          <pre key={`code-${elements.length}`} className={styles.codeBlock}>
            {codeBlockContent}
          </pre>
        );
        codeBlockContent = [];
      }
    };

    macro.parts.forEach((part, partIndex) => {
      if (part.type === "text") {
        const lines = part.content.split("\n");

        lines.forEach((line, lineIndex) => {
          // Check for code block markers
          if (line.trim().startsWith("```")) {
            if (isInCodeBlock) {
              // End of code block
              flushLine();
              flushCodeBlock();
              isInCodeBlock = false;
            } else {
              // Start of code block
              isInCodeBlock = true;
            }
            return;
          }

          if (isInCodeBlock) {
            // Inside code block - keep even empty lines so spacing is preserved
            currentLineContent.push(line ? line : "\u00A0");
            if (lineIndex < lines.length - 1) {
              flushLine();
            }
          } else {
            // Regular text
            const text = lineIndex < lines.length - 1 ? line + "\n" : line;
            if (text) {
              elements.push(
                <span key={`text-${partIndex}-${lineIndex}`} className={styles.text}>
                  {text}
                </span>
              );
            }
          }
        });
      } else {
        // Gap field
        const currentGapIndex = gapCounter++;
        const answer = answers[currentGapIndex] ?? "";
        const valueToCompare = part.gap.mode === "text" ? answer.toLowerCase() : answer;
        const correctOptions =
          part.gap.mode === "text"
            ? part.gap.correct.map((option) => option.toLowerCase())
            : part.gap.correct;
        const isCorrect = correctOptions.includes(valueToCompare);

        const gapElement = (
          <GapField
            key={`gap-${partIndex}`}
            gap={part.gap}
            value={answer}
            onChange={(value) => handleChange(currentGapIndex, value)}
            isInCodeBlock={isInCodeBlock}
            isChecked={isChecked}
            isCorrect={isCorrect}
          />
        );

        if (isInCodeBlock) {
          currentLineContent.push(gapElement);
        } else {
          elements.push(gapElement);
        }
      }
    });

    // Flush any remaining content
    if (isInCodeBlock) {
      flushLine();
      flushCodeBlock();
    }

    return elements;
  };

  return <div className={styles.gap}>{renderParts()}</div>;
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
        className={`${styles.gapField} ${isInCodeBlock ? styles.gapInCode : ""} ${stateClass}`}
        style={widthStyle}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isChecked}
          className={styles.gapControl}
          placeholder="..."
        />
      </span>
    );
  }

  // MCQ mode - dropdown
  return (
    <span
      className={`${styles.gapField} ${isInCodeBlock ? styles.gapInCode : ""} ${stateClass}`}
      style={widthStyle}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isChecked}
        className={`${styles.gapControl} ${styles.gapSelect}`}
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
