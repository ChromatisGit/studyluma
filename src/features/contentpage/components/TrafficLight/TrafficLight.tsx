'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { UnderstandingLevel, DifficultyCause, CheckpointResponse } from '@schema/checkpointTypes';
import CONTENTPAGE_TEXT from '@features/contentpage/contentpage.de.json';
import styles from './TrafficLight.module.css';

interface TrafficLightProps {
  onSubmit: (response: CheckpointResponse) => void;
}

const LEVELS: { value: UnderstandingLevel; colorClass: string }[] = [
  { value: 'green',  colorClass: styles.levelGreen  },
  { value: 'yellow', colorClass: styles.levelYellow },
  { value: 'red',    colorClass: styles.levelRed    },
];

const CAUSES: DifficultyCause[] = ['topic', 'task', 'approach', 'execution', 'mistake', 'other'];

export function TrafficLight({ onSubmit }: TrafficLightProps) {
  const [selectedLevel, setSelectedLevel] = useState<UnderstandingLevel | null>(null);
  const [selectedCauses, setSelectedCauses] = useState<DifficultyCause[]>([]);

  const needsCause = selectedLevel === 'yellow' || selectedLevel === 'red';
  const canSubmit = selectedLevel !== null && (!needsCause || selectedCauses.length > 0);

  const handleLevelSelect = (level: UnderstandingLevel) => {
    setSelectedLevel(level);
    if (level === 'green') setSelectedCauses([]);
  };

  const handleCauseToggle = (cause: DifficultyCause) => {
    setSelectedCauses(prev =>
      prev.includes(cause) ? prev.filter(c => c !== cause) : [...prev, cause]
    );
  };

  const handleSubmit = () => {
    if (!canSubmit || selectedLevel === null) return;
    const response: CheckpointResponse = {
      understanding: selectedLevel,
      causes: needsCause && selectedCauses.length > 0 ? selectedCauses : undefined,
      submittedAt: Date.now(),
    };
    onSubmit(response);
  };

  const text = CONTENTPAGE_TEXT.trafficLight;

  return (
    <div className={styles.trafficLight}>
      <p className={styles.question}>{text.question}</p>

      <div className={styles.levelButtons}>
        {LEVELS.map(({ value, colorClass }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleLevelSelect(value)}
            className={`${styles.levelButton} ${colorClass} ${selectedLevel === value ? styles.levelButtonSelected : ''}`}
          >
            <span className={styles.levelDot} aria-hidden />
            <span>{text.levels[value]}</span>
          </button>
        ))}
      </div>

      {needsCause && (
        <div className={styles.causeSection}>
          <p className={styles.causeQuestion}>{text.causeQuestion}</p>
          <div className={styles.causeOptions}>
            {CAUSES.map(cause => (
              <label key={cause} className={styles.causeOption}>
                <input
                  type="checkbox"
                  value={cause}
                  checked={selectedCauses.includes(cause)}
                  onChange={() => handleCauseToggle(cause)}
                  className={styles.causeRadioHidden}
                />
                <span className={`${styles.causeCheckbox} ${selectedCauses.includes(cause) ? styles.causeCheckboxChecked : ''}`}>
                  {selectedCauses.includes(cause) && <X className={styles.causeCheckboxIcon} aria-hidden />}
                </span>
                <span className={styles.causeLabel}>{text.causes[cause]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={styles.submitButton}
      >
        {text.submitButton}
      </button>
    </div>
  );
}
