import { useEffect, useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { Check, X } from 'lucide-react';
import { parseTextWithCode } from '@features/worksheet/components/CodeBlock/parseTextWithCode';
import styles from './McqTask.module.css';
import type { McqTask as McqTaskType } from '@worksheet/worksheetModel';
import { chunkSections } from '@features/homepage/sections/CourseSection/sectionSplitter';

function chunkIntoColumns<T>(items: T[], maxPerRow: number): T[][] {
  const rows: T[][] = [];
  const size = Math.max(1, Math.floor(maxPerRow));

  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }

  return rows;
}

interface McqTaskProps {
  task: McqTaskType;
  isSingleTask?: boolean;
  triggerCheck: number;
}

export function McqTask({ task, isSingleTask = false, triggerCheck }: McqTaskProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const isSingleChoice = task.single;
  const groupName = useId();

  // Handle check solution trigger
  useEffect(() => {
    if (triggerCheck > 0 && selected.length > 0) {
      setIsChecked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerCheck]); // Only trigger on check button press, not on selection changes

  // Determine if task should be locked
  const isLocked = isChecked;
  const optionRows = task.wideLayout
    ? chunkIntoColumns(task.options, 2)
    : chunkSections(task.options);

  const handleSelect = (option: string) => {
    if (isLocked) return;

    if (isSingleChoice) {
      setSelected([option]);
    } else {
      setSelected(prev =>
        prev.includes(option)
          ? prev.filter(o => o !== option)
          : [...prev, option]
      );
    }
  };

  const getOptionStyles = (option: string, isSelected: boolean) => {
    const isCorrect = task.correct.includes(option);
    const showWrong = isLocked && isSelected && !isCorrect;
    const showCorrect = isLocked && isCorrect && isSelected;
    const showMissed = isLocked && isCorrect && !isSelected;

    const optionClasses = [styles.optionCard];
    if (!isLocked) {
      optionClasses.push(styles.optionInteractive);
    }
    if (showWrong) {
      optionClasses.push(styles.optionStateWrong);
    } else if (showCorrect) {
      optionClasses.push(styles.optionStateCorrect);
    } else if (showMissed) {
      optionClasses.push(styles.optionStateMissed);
    } else if (isSelected) {
      optionClasses.push(styles.optionStateActive);
    }
    if (isLocked) {
      optionClasses.push(styles.optionLocked);
    }

    return {
      className: optionClasses.join(' '),
      showWrong,
      showCorrect,
      showMissed,
    };
  };

  return (
    <div className={`${styles.stackMedium} ${isSingleTask ? styles.stackTight : ''}`}>
      <div className={styles.bodyText}>{parseTextWithCode(task.question, styles.bodyText)}</div>

      <div className={styles.optionGrid}>
        {optionRows.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className={styles.optionRow}
            style={{ '--columns': row.length } as CSSProperties}
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
                  {optionStyles.showCorrect && <Check className={styles.optionIcon} />}
                  {optionStyles.showWrong && <X className={styles.optionIcon} />}
                  {optionStyles.showMissed && <Check className={styles.optionIcon} />}
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
