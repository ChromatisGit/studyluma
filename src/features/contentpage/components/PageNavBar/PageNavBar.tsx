'use client';

import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import CONTENTPAGE_TEXT from '@features/contentpage/contentpage.de.json';
import styles from './PageNavBar.module.css';

interface PageNavBarProps {
  onBack: () => void;
  onNext: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  currentIndex: number;
  totalSections: number;
  lockedReason?: string;
}

export function PageNavBar({ onBack, onNext, canGoNext, currentIndex, totalSections, lockedReason }: PageNavBarProps) {
  const text = CONTENTPAGE_TEXT.navigation;

  const isFirstPage = currentIndex === 0;
  const isLastPage = currentIndex === totalSections - 1;

  // Pulse animation when Next unlocks for the first time on the current section.
  // Reset on section navigation so revisiting a completed section never re-pulses.
  const prevCurrentIndex = useRef(currentIndex);
  const prevCanGoNext = useRef(canGoNext);
  const [unlockPulse, setUnlockPulse] = useState(false);

  useEffect(() => {
    if (prevCurrentIndex.current !== currentIndex) {
      // We navigated to a different section — reset tracking without pulsing.
      prevCurrentIndex.current = currentIndex;
      prevCanGoNext.current = canGoNext;
      setUnlockPulse(false);
      return;
    }
    // Same section: only pulse on false → true transition.
    if (!prevCanGoNext.current && canGoNext) {
      setUnlockPulse(true);
    }
    prevCanGoNext.current = canGoNext;
  }, [canGoNext, currentIndex]);

  const nextTooltip = canGoNext
    ? `${text.nextPageTooltip} ${currentIndex + 2}`
    : lockedReason;

  return (
    <div className={styles.navBar}>
      <button
        type="button"
        onClick={onBack}
        className={clsx(styles.navButton, isFirstPage && styles.hidden)}
        aria-label={text.previous}
        aria-hidden={isFirstPage || undefined}
        tabIndex={isFirstPage ? -1 : undefined}
      >
        <ChevronLeft className={styles.navIcon} />
        <span>{text.previous}</span>
      </button>

      <span className={styles.pageIndicator} aria-live="polite">
        {currentIndex + 1} / {totalSections}
      </span>

      <button
        type="button"
        onClick={() => { setUnlockPulse(false); onNext(); }}
        disabled={!canGoNext}
        className={clsx(
          styles.navButton,
          isLastPage && styles.hidden,
          unlockPulse && styles.unlockPulse,
        )}
        title={isLastPage ? undefined : nextTooltip}
        aria-label={text.next}
        aria-hidden={isLastPage || undefined}
        tabIndex={isLastPage ? -1 : undefined}
      >
        <span>{text.next}</span>
        <ChevronRight className={styles.navIcon} />
      </button>
    </div>
  );
}
