import type { SectionSlide } from "@schema/slideTypes";
import styles from "./slide.module.css";

type Props = { slide: SectionSlide };

export function SectionSlideView({ slide }: Props) {
  return (
    <div className={styles.sectionOverlay}>
      {slide.subtitle && (
        <p className={styles.sectionSubtitle}>{slide.subtitle}</p>
      )}
      <h2 className={styles.sectionTitle}>{slide.header}</h2>
    </div>
  );
}
