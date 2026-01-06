"use client";

import type { InfoBlock as InfoBlockType } from "@features/worksheet/worksheetModel";
import { parseTextWithCode } from "@components/CodeBlock/parseTextWithCode";
import sharedStyles from "@features/worksheet/styles/shared.module.css";
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
      {parseTextWithCode(info.text, sharedStyles.bodyText)}
    </div>
  );
}
