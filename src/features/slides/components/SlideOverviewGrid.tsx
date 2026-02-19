"use client";

import type { Slide } from "@schema/slideTypes";
import styles from "./SlideOverviewGrid.module.css";

type SlideOverviewGridProps = {
  slides: Slide[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
};

export function SlideOverviewGrid({
  slides,
  currentIndex,
  onSelect,
  onClose,
}: SlideOverviewGridProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.grid} onClick={(e) => e.stopPropagation()}>
        {slides.map((slide, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.thumbnail} ${i === currentIndex ? styles.active : ""}`}
            onClick={() => {
              onSelect(i);
              onClose();
            }}
          >
            <span className={styles.slideNumber}>{i + 1}</span>
            <span className={styles.slideTitle}>{slide.header}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
