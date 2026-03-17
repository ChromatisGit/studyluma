import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import styles from "./slide.module.css";

type BulletListProps = {
  bullets: string[];
  accent: string;       // CSS color value for bullet markers
  revealedCount: number; // how many bullets are visible (0 = all shown in non-reveal mode)
  alwaysVisible?: boolean; // skip reveal animation (e.g. recap slide)
};

export function BulletList({ bullets, accent, revealedCount, alwaysVisible }: BulletListProps) {
  return (
    <div className={styles.bulletContainer}>
    <ul className={styles.bulletList}>
      {bullets.map((bullet, i) => {
        const visible = alwaysVisible || i < revealedCount;
        const [mainText, ...subLines] = bullet.split("\n");
        return (
          <li
            key={i}
            className={`${styles.bulletItem} ${visible ? styles.bulletItemVisible : styles.bulletItemHidden}`}
          >
            <span
              className={styles.bulletMarker}
              style={{ background: accent }}
            />
            <span className={styles.bulletText}>
              <MarkdownRenderer markdown={mainText} />
              {subLines.map((sub, j) => (
                <span key={j} className={styles.bulletSubLine}>
                  <MarkdownRenderer markdown={sub} />
                </span>
              ))}
            </span>
          </li>
        );
      })}
    </ul>
    </div>
  );
}
