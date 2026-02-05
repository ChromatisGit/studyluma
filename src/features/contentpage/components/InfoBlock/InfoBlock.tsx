"use client";

import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import type { Markdown } from "@schema/page";

import sharedStyles from '@features/contentpage/contentpage.module.css';
import styles from "./InfoBlock.module.css";

export interface InfoBlock {
  kind: "info";
  title: string;
  text: Markdown | string;
}

interface InfoBlockProps {
  info: InfoBlock;
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
      <div className={sharedStyles.bodyText}>
        <MarkdownRenderer markdown={typeof info.text === 'string' ? info.text : info.text.markdown} />
      </div>
    </div>
  );
}
