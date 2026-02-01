'use client';

import clsx from 'clsx';
import { Info, Flag, Target, Zap } from 'lucide-react';
import { InfoBlock } from '@features/contentpage/components/InfoBlock/InfoBlock';
import { TaskSetComponent } from '@features/contentpage/components/Group/TaskSetComponent';
import { MarkdownRenderer } from '@features/contentpage/components/MarkdownRenderer/MarkdownRenderer';
import { renderMacro } from '@features/contentpage/macros/registry';
import type { Macro } from '@schema/macroTypes';

import styles from './CategorySection.module.css';
import CONTENTPAGE_TEXT from '@features/contentpage/contentpage.de.json';
import sharedStyles from '@features/contentpage/styles/shared.module.css';
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

export type Category =
  | {
      kind: "info";
      title: string;
      items: CategoryItem[];
    }
  | {
      kind: "checkpoint" | "core" | "challenge";
      items: CategoryItem[];
    };

interface CategorySectionProps {
  block: Category;
  categoryIndex: number;
  taskNumbers: Record<string, number>;
}

const categoryConfig = {
  info: {
    label: CONTENTPAGE_TEXT.categories.info,
    icon: Info,
  },
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
} satisfies Record<Category["kind"], { label: string; icon: typeof Info }>;

export function CategorySection({ block, categoryIndex, taskNumbers }: CategorySectionProps) {
  const config = categoryConfig[block.kind];
  const Icon = config.icon;
  const variantClass =
    block.kind === 'info'
      ? styles.categoryInfo
      : block.kind === 'checkpoint'
        ? styles.categoryCheckpoint
        : block.kind === 'core'
          ? styles.categoryCore
          : styles.categoryChallenge;

  return (
    <section className={clsx(styles.category, variantClass)}>
      <div className={styles.categoryStripe} aria-hidden />

      <div className={styles.categoryBanner}>
        <Icon className={styles.categoryBannerIcon} />
        <span className={styles.categoryBannerTitle}>{block.kind === 'info' ? block.title : config.label}</span>
      </div>

      {block.kind === 'info' && (
        <div className={styles.infoCard}>
          {block.items.map((item, index) => {
            if (item.kind === 'info') {
              return (
                <div key={index} className={sharedStyles.bodyText}>
                  <MarkdownRenderer markdown={typeof item.text === 'string' ? item.text : item.text.markdown} />
                </div>
              );
            }
            if (item.kind === 'displayMacro') {
              return renderMacro(item.macro, { persistState: false }, index);
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
      )}

      {block.kind !== 'info' && (
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
                  categoryType={block.kind}
                  taskNumber={taskNumbers[`${categoryIndex}-${index}`]}
                />
              );
            }
            if (item.kind === 'displayMacro') {
              return renderMacro(item.macro, { persistState: false }, index);
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
      )}
    </section>
  );
}
