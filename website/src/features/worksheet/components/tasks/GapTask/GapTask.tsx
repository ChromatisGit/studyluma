import { useEffect, useRef, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { renderInlineMarkdown } from '@features/worksheet/components/CodeBlock/parseTextWithCode';
import codeStyles from '@features/worksheet/components/CodeBlock/CodeBlock.module.css';
import { strings } from '@features/worksheet/config/strings';
import styles from './GapTask.module.css';
import type { GapField as GapFieldType, GapTask as GapTaskType } from '@worksheet/worksheetModel';
import { Highlight } from 'prism-react-renderer';
import { transparentCodeTheme } from '@features/worksheet/components/CodeBlock/codeTheme';
import { useTaskPersistence } from '@features/worksheet/storage/useTaskPersistence';

interface GapTaskProps {
  task: GapTaskType;
  isSingleTask?: boolean;
  triggerCheck: number;
  taskKey: string;
}

export function GapTask({ task, isSingleTask = false, triggerCheck, taskKey }: GapTaskProps) {
  const { value: answers, setValue: setAnswers, worksheetId } = useTaskPersistence<Record<number, string>>(taskKey, {});
  const [validatedGaps, setValidatedGaps] = useState<Set<number>>(new Set());
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    setValidatedGaps(new Set());
  }, [worksheetId]);

  const handleAnswerChange = (gapIndex: number, value: string) => {
    setAnswers(prev => ({ ...prev, [gapIndex]: value }));
    // Remove from validated gaps when changed
    setValidatedGaps(prev => {
      const newSet = new Set(prev);
      newSet.delete(gapIndex);
      return newSet;
    });
  };

  // Validate only when the check button is pressed using the current answers snapshot.
  useEffect(() => {
    if (triggerCheck > 0) {
      const filledGapIndices = Object.entries(answersRef.current)
        .filter(([_, value]) => value.trim())
        .map(([index]) => Number(index));
      setValidatedGaps(new Set(filledGapIndices));
    }
  }, [triggerCheck]);

  let gapCounter = 0;

  // Process parts to handle code blocks properly
  const renderParts = () => {
    const elements: JSX.Element[] = [];
    let isInCodeBlock = false;
    let codeBlockContent: JSX.Element[] = [];
    let currentLineContent: ReactNode[] = [];
    let lineKey = 0;

    const flushLine = () => {
      if (currentLineContent.length === 0) return;

      const lineKeyVal = lineKey++;
      const fragments = currentLineContent;
      currentLineContent = [];

      codeBlockContent.push(
        <div key={`line-${lineKeyVal}`} className={codeStyles.codeLine}>
          {fragments.map((frag, fragIndex) => {
            if (typeof frag === 'string') {
              return (
                <Highlight
                  key={fragIndex}
                  theme={transparentCodeTheme}
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
          <div key={`code-${elements.length}`} className={codeStyles.codeBlock}>
            {codeBlockContent}
          </div>
        );
        codeBlockContent = [];
      }
    };

    task.parts.forEach((part, partIndex) => {
      if (part.type === "text") {
        const lines = part.content.split('\n');

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
            currentLineContent.push(line ? line : '\u00A0');
            if (lineIndex < lines.length - 1) {
              flushLine();
            }
          } else {
            // Regular text
            const text = lineIndex < lines.length - 1 ? line + '\n' : line;
            if (text) {
              elements.push(
                <span key={`text-${partIndex}-${lineIndex}`} className={styles.inlineText}>
                  {renderInlineMarkdown(text)}
                </span>
              );
            }
          }
        });
      } else {
        // Gap field
        const currentGapIndex = gapCounter++;
        const answerValue = answers[currentGapIndex] || '';
        const valueToCompare = part.gap.mode === 'text' ? answerValue.toLowerCase() : answerValue;
        const correctOptions =
          part.gap.mode === 'text'
            ? part.gap.correct.map(option => option.toLowerCase())
            : part.gap.correct;
        const gapElement = (
          <GapField
            key={`gap-${partIndex}`}
            gap={part.gap}
            gapIndex={currentGapIndex}
            value={answerValue}
            onChange={(value) => handleAnswerChange(currentGapIndex, value)}
            isInCodeBlock={isInCodeBlock}
            isValidated={validatedGaps.has(currentGapIndex)}
            isCorrect={correctOptions.includes(valueToCompare)}
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

  return (
    <div className={styles.stackSmall}>
      <div className={`${styles.bodyText} ${isSingleTask ? styles.stackTight : ''}`}>
        {renderParts()}
      </div>
    </div>
  );
}

interface GapFieldProps {
  gap: GapFieldType;
  gapIndex: number;
  value: string;
  onChange: (value: string) => void;
  isInCodeBlock?: boolean;
  isValidated?: boolean;
  isCorrect?: boolean;
}

function GapField({ gap, value, onChange, isInCodeBlock = false, isValidated = false, isCorrect }: GapFieldProps) {
  const options = gap.options ?? gap.correct;
  const longestText = options.reduce<string>(
    (longest, option) => option.length > longest.length ? option : longest,
    ""
  );

  const baseWidth = Math.max(longestText.length * 0.71, 1.45) ;
  const inputWidth = gap.mode === "mcq" ? `${baseWidth + 1.1}rem` : `${baseWidth}rem`;
  const widthStyle = { width: inputWidth, minWidth: inputWidth };

  // Determine validation state - only show validation if gap has been validated
  const showWrong = isValidated && value && !isCorrect;
  const showCorrect = isValidated && isCorrect;

  const stateClass = showWrong
    ? styles.gapWrong
    : showCorrect
      ? styles.gapCorrect
      : styles.gapActive;

  if (gap.mode === "text") {
    return (
      <span
        className={`${styles.gapField} ${isInCodeBlock ? styles.gapInCode : ''} ${stateClass}`}
        style={widthStyle}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.gapControl}
          placeholder={strings.gapTask.textPlaceholder}
        />
      </span>
    );
  }

  // MCQ mode - dropdown
  return (
    <span
      className={`${styles.gapField} ${isInCodeBlock ? styles.gapInCode : ''} ${stateClass}`}
      style={widthStyle}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${styles.gapControl} ${styles.gapSelect}`}
      >
        <option value="" disabled hidden/>
        {options.map((option: string, index: number) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className={styles.gapChevron} />
    </span>
  );
}
