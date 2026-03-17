import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { SlideCodeRunner } from "./SlideCodeRunner";
import type { SlideContentItem } from "@schema/slideTypes";
import styles from "./slide.module.css";

type MaterialRendererProps = {
  item: SlideContentItem;
  projector?: boolean;
};

export function MaterialRenderer({ item, projector }: MaterialRendererProps) {
  if (item.type === "text") {
    return <MarkdownRenderer markdown={item.content} />;
  }

  if (item.type === "formula") {
    return (
      <div className={styles.formula}>
        <MarkdownRenderer markdown={item.expr} />
      </div>
    );
  }

  if (item.type === "image") {
    return (
      <div className={styles.imageWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.file}
          alt={typeof item.label === "string" ? item.label : ""}
          className={`${styles.image} ${projector ? styles.imageProjector : ""}`}
        />
        {item.label && (
          <span className={styles.imageLabel}>
            <MarkdownRenderer markdown={item.label} />
          </span>
        )}
      </div>
    );
  }

  if (item.type === "codeRunner") {
    return <SlideCodeRunner code={item.code} language={item.language} storageKey={item.code} readOnly={projector} />;
  }

  if (item.type === "link") {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      >
        → {item.label ?? item.url}
      </a>
    );
  }

  return null;
}
