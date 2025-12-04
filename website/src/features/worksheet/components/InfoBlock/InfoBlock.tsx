import type { InfoBlock as InfoBlockType } from "@worksheet/worksheetModel";
import { parseTextWithCode } from "@features/worksheet/components/CodeBlock/parseTextWithCode";
import styles from "./InfoBlock.module.css";

interface InfoBlockProps {
  info: InfoBlockType;
}

export function InfoBlock({ info }: InfoBlockProps) {
  return (
    <div className={styles.infoBlock}>
      <div className={styles.infoBlockHeader}>
        <div className={styles.infoBadge}>
          <span className={styles.infoBadgeSymbol}>i</span>
        </div>
        <h3 className={styles.infoHeading}>{info.title}</h3>
      </div>
      <div className={styles.bodyText}>
        {parseTextWithCode(info.text, styles.bodyText)}
      </div>
    </div>
  );
}
