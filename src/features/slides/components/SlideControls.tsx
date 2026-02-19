"use client";

import styles from "./SlideControls.module.css";

type SlideControlsProps = {
  slideIndex: number;
  totalSlides: number;
  blackout: boolean;
  onNext: () => void;
  onPrev: () => void;
  onBlackout: () => void;
  onFullscreen: () => void;
  onOpenProjector: () => void;
};

export function SlideControls({
  slideIndex,
  totalSlides,
  blackout,
  onNext,
  onPrev,
  onBlackout,
  onFullscreen,
  onOpenProjector,
}: SlideControlsProps) {
  return (
    <div className={styles.controls}>
      <button
        type="button"
        onClick={onPrev}
        disabled={slideIndex <= 0}
        className={styles.navButton}
        title="Previous (Arrow Left)"
      >
        &#9664;
      </button>
      <span className={styles.counter}>
        {slideIndex + 1} / {totalSlides}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={slideIndex >= totalSlides - 1}
        className={styles.navButton}
        title="Next (Arrow Right)"
      >
        &#9654;
      </button>
      <div className={styles.separator} />
      <button
        type="button"
        onClick={onBlackout}
        className={`${styles.actionButton} ${blackout ? styles.active : ""}`}
        title="Blackout (B)"
      >
        B
      </button>
      <button
        type="button"
        onClick={onFullscreen}
        className={styles.actionButton}
        title="Fullscreen (F)"
      >
        F
      </button>
      <button
        type="button"
        onClick={onOpenProjector}
        className={styles.projectorButton}
      >
        Projektor
      </button>
    </div>
  );
}
