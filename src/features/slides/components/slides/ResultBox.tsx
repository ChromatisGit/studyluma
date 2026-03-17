import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { MaterialRenderer } from "./MaterialRenderer";
import type { SlideContentItem } from "@schema/slideTypes";
import styles from "./slide.module.css";

type ResultBoxProps = {
  result: string | SlideContentItem;
  visible: boolean;
  accent?: string;
};

export function ResultBox({ result, visible, accent }: ResultBoxProps) {
  return (
    <div
      className={`${styles.result} ${visible ? styles.resultVisible : styles.resultHidden}`}
      style={accent ? ({ "--slide-result-accent": accent } as React.CSSProperties) : undefined}
    >
      {typeof result === "string" ? (
        <MarkdownRenderer markdown={result} />
      ) : (
        <MaterialRenderer item={result} />
      )}
    </div>
  );
}
