import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import type { RecapSlide } from "@schema/slideTypes";
import { SlideHeader } from "./SlideHeader";
import styles from "./slide.module.css";

type Props = { slide: RecapSlide };

export function RecapSlideView({ slide }: Props) {
  return (
    <>
      <SlideHeader title={slide.header} badge="Zusammenfassung" accent="orange" />
      <div className={`${styles.slideContent} ${styles.slideContentCentered}`}>
        <div className={styles.recapCard}>
          <div className={styles.recapCardTitle}>Das Wichtigste</div>
          <div className={styles.recapCardDivider} />
          <ul className={styles.recapBulletList}>
            {slide.bullets.map((bullet, i) => (
              <li key={i} className={styles.recapBulletItem}>
                <span className={styles.recapBulletMarker}>▸</span>
                <span className={styles.recapBulletText}>
                  <MarkdownRenderer markdown={bullet} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
