import styles from "./SlideHeader.module.css";

type AccentColor = "purple" | "orange" | "blue" | "teal" | "muted";

const ACCENT_CSS: Record<AccentColor, string> = {
  purple: "var(--primary)",
  orange: "var(--warning)",
  blue:   "var(--info)",
  teal:   "var(--support)",
  muted:  "var(--muted-foreground)",
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
