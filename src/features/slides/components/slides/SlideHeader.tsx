import styles from "./slide.module.css";

type AccentColor = "purple" | "orange" | "blue" | "teal" | "muted";

const ACCENT_CSS: Record<AccentColor, string> = {
  purple: "var(--sn-purple-accent)",
  orange: "var(--sn-orange-accent)",
  blue:   "var(--sn-blue-accent)",
  teal:   "var(--sn-teal-accent)",
  muted:  "var(--sn-text-muted)",
};

type SlideHeaderProps = {
  title: string;
  badge?: string;
  accent: AccentColor;
};

export function SlideHeader({ title, badge, accent }: SlideHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerRow}>
        {badge && (
          <span
            className={styles.badge}
            style={{ background: ACCENT_CSS[accent] }}
          >
            {badge}
          </span>
        )}
        <h2 className={styles.headerTitle}>{title}</h2>
      </div>
      <hr className={styles.headerDivider} />
    </div>
  );
}
