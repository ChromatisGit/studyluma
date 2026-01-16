'use client';

import { Info, Flag, Target, Zap } from 'lucide-react';
import { InfoBlock } from '@features/contentpage/components/InfoBlock/InfoBlock';
import { TaskSetComponent } from '@features/contentpage/components/Group/TaskSetComponent';
import { MarkdownRenderer } from '@features/contentpage/components/MarkdownRenderer/MarkdownRenderer';
import type { Markdown } from '@domain/page';

import styles from './CategorySection.module.css';
import CONTENTPAGE_TEXT from '@features/contentpage/contentpage.de.json';
import sharedStyles from '@features/contentpage/styles/shared.module.css';
import type { InfoBlock as InfoBlockType } from '@features/contentpage/components/InfoBlock/InfoBlock';
import type { TaskSet } from '@features/contentpage/components/Group/TaskSetComponent';

export type Category =
  | {
      kind: "info";
      title: string;
      text: Markdown | string;
    }
  | {
      kind: "checkpoint" | "core" | "challenge";
      items: Array<InfoBlockType | TaskSet>;
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
    <section className={`${styles.category} ${variantClass}`}>
      <div className={styles.categoryStripe} aria-hidden />

      <div className={styles.categoryBanner}>
        <Icon className={styles.categoryBannerIcon} />
        <span className={styles.categoryBannerTitle}>{block.kind === 'info' ? block.title : config.label}</span>
      </div>

      {block.kind === 'info' && (
        <div className={styles.infoCard}>
          <div className={sharedStyles.bodyText}>
            <MarkdownRenderer markdown={typeof block.text === 'string' ? block.text : block.text.markdown} />
          </div>
        </div>
      )}

      {block.kind !== 'info' && (
        <div className={styles.sectionSpacing}>
          {block.items.map((item, index) => {
            if (item.kind === "info") {
              return <InfoBlock key={index} info={item} />;
            }

            return (
              <TaskSetComponent
                key={index}
                taskSet={item}
                categoryType={block.kind}
                taskNumber={taskNumbers[`${categoryIndex}-${index}`]}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
