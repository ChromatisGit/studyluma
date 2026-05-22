'use client';

import { useState, useEffect } from 'react';
import type { CheckpointResponse } from '@schema/checkpointTypes';
import { useWorksheetStorage, useWorksheetSyncStatus } from '@features/contentpage/storage/WorksheetStorageContext';
import { TrafficLight } from '@features/contentpage/components/TrafficLight/TrafficLight';
import styles from './CheckpointOverlay.module.css';

interface CheckpointOverlayProps {
  sectionIndex: number;
  onSubmitted: () => void;
}

export function CheckpointOverlay({ sectionIndex, onSubmitted }: CheckpointOverlayProps) {
  const storage = useWorksheetStorage();
  const { checkpointState } = useWorksheetSyncStatus();
  // null = not yet checked, true = already submitted, false = needs input
  const [isSubmitted, setIsSubmitted] = useState<boolean | null>(null);
  const [isPendingSubmit, setIsPendingSubmit] = useState(false);

  useEffect(() => {
    if (!storage) return;
    if (storage.hasCheckpoint(sectionIndex)) {
      setIsSubmitted(true);
      onSubmitted();
    } else {
      setIsSubmitted(false);
    }
  // onSubmitted is intentionally excluded — only run on mount / storage change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage, sectionIndex]);

  useEffect(() => {
    if (!isPendingSubmit || checkpointState !== 'idle') return;
    const timeout = window.setTimeout(() => {
      setIsSubmitted(true);
      setIsPendingSubmit(false);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [checkpointState, isPendingSubmit]);

  // Don't render until we've confirmed there's no existing data
  if (isSubmitted !== false && !isPendingSubmit) return null;

  const handleSubmit = (response: CheckpointResponse) => {
    storage?.markCheckpointSubmitted(sectionIndex, response);
    setIsPendingSubmit(true);
    onSubmitted();
  };

  return (
    <div className={styles.overlay}>
      <TrafficLight onSubmit={handleSubmit} isSubmitting={isPendingSubmit} />
    </div>
  );
}
