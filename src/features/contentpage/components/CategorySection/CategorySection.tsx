'use client';

import clsx from 'clsx';
import { Flag, Target, Zap } from 'lucide-react';
import { InfoBlock } from '@features/contentpage/components/InfoBlock/InfoBlock';
import { TaskSetComponent } from '@features/contentpage/components/Group/TaskSetComponent';
import { MarkdownRenderer } from '@features/contentpage/components/MarkdownRenderer/MarkdownRenderer';
import { type Macro, renderMacro } from '@macros/registry';

import styles from './CategorySection.module.css';
import CONTENTPAGE_TEXT from '@features/contentpage/contentpage.de.json';
import type { InfoBlock as InfoBlockType } from '@features/contentpage/components/InfoBlock/InfoBlock';
import type { TaskSet } from '@features/contentpage/components/Group/TaskSetComponent';

export type DisplayMacroItem = {
  kind: 'displayMacro';
  macro: Macro;
};

export type SubheaderItem = {
  kind: 'subheader';
  title: string;
};

export type CategoryItem = InfoBlockType | TaskSet | DisplayMacroItem | SubheaderItem;

export type Category = {
  kind: "checkpoint" | "core" | "challenge";
  items: CategoryItem[];
  isPdf?: boolean | undefined;
  pdfUrl?: string | undefined;
  pdfFileName?: string | undefined;
};

interface CategorySectionProps {
  block: Category;
  categoryIndex: number;
  taskNumbers: Record<string, number>;
  triggerCheck: number;
}

const categoryConfig = {
  checkpoint: {
    label: CONTENTPAGE_TEXT.categories.checkpoint,
    icon: Flag,
  },
  core: {
    label: CONTENTPAGE_TEXT.categories.core,
    icon: Target,
  },
  challenge: {
    label: CONTENTPAGE_TEXT.categories.challenge,
    icon: Zap,
  },
} satisfies Record<Category["kind"], { label: string; icon: typeof Flag }>;

export function CategorySection({ block, categoryIndex, taskNumbers, triggerCheck }: CategorySectionProps) {
  const config = categoryConfig[block.kind];
  const Icon = config.icon;
  const variantClass =
    block.kind === 'checkpoint'
      ? styles.categoryCheckpoint
      : block.kind === 'core'
        ? styles.categoryCore
        : styles.categoryChallenge;

  return (
    <section className={clsx(styles.category, variantClass)}>
      <div className={styles.categoryStripe} aria-hidden />

      <div className={styles.categoryBanner}>
        <Icon className={styles.categoryBannerIcon} />
        <span className={styles.categoryBannerTitle}>{config.label}</span>
      </div>

      <div className={styles.sectionSpacing}>
        {block.items.map((item, index) => {
          if (item.kind === "info") {
            return <InfoBlock key={index} info={item} />;
          }
          if (item.kind === "taskSet") {
            return (
              <TaskSetComponent
                key={index}
                taskSet={item}
                taskNumber={taskNumbers[`${categoryIndex}-${index}`]}
                triggerCheck={triggerCheck}
                isPdfSection={block.isPdf}
              />
            );
          }
          if (item.kind === 'displayMacro') {
            return renderMacro(
              item.macro,
              { storageKey: `${item.macro.type}-${categoryIndex}-${index}` },
              index,
            );
          }
          if (item.kind === 'subheader') {
            return (
              <h3 key={index} className={styles.subheader}>
                <MarkdownRenderer markdown={item.title} />
              </h3>
            );
          }
          return null;
        })}
      </div>
    </section>
  );
}
