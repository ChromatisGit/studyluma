'use client';

import { useState, useEffect } from 'react';
import type { CheckpointResponse } from '@schema/checkpointTypes';
import { useWorksheetStorage } from '@features/contentpage/storage/WorksheetStorageContext';
import { TrafficLight } from '@features/contentpage/components/TrafficLight/TrafficLight';
import styles from './CheckpointOverlay.module.css';

interface CheckpointOverlayProps {
  sectionIndex: number;
  onSubmitted: () => void;
}

export function CheckpointOverlay({ sectionIndex, onSubmitted }: CheckpointOverlayProps) {
  const storage = useWorksheetStorage();
  // null = not yet checked, true = already submitted, false = needs input
  const [isSubmitted, setIsSubmitted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!storage) return;
    const existing = storage.readCheckpoint(sectionIndex);
    if (existing) {
      setIsSubmitted(true);
      onSubmitted();
    } else {
      setIsSubmitted(false);
    }
  // onSubmitted is intentionally excluded — only run on mount / storage change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage, sectionIndex]);

  // Don't render until we've confirmed there's no existing data
  if (isSubmitted !== false) return null;

  const handleSubmit = (response: CheckpointResponse) => {
    storage?.saveCheckpoint(sectionIndex, response);
    setIsSubmitted(true);
    onSubmitted();
  };

  return (
    <div className={styles.overlay}>
      <TrafficLight onSubmit={handleSubmit} />
    </div>
  );
}
