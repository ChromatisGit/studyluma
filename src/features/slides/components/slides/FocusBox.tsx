import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import styles from "./slide.module.css";

type FocusBoxProps = {
  text: string;
  accent: string;   // CSS color value
  task?: boolean;   // task variant: solid teal block
};

export function FocusBox({ text, accent, task }: FocusBoxProps) {
  if (task) {
    return (
      <div className={styles.focusTask}>
        <MarkdownRenderer markdown={text} />
      </div>
    );
  }
  return (
    <div
      className={styles.focus}
      style={{ "--slide-accent": accent } as React.CSSProperties}
    >
      <MarkdownRenderer markdown={text} />
    </div>
  );
}
