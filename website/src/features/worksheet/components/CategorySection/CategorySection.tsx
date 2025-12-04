import { Info, Flag, Target, Zap } from 'lucide-react';
import { type RefObject } from 'react';
import { InfoBlock } from '@features/worksheet/components/InfoBlock/InfoBlock';
import { TaskSetComponent } from '@features/worksheet/components/TaskSet/TaskSetComponent';
import { parseTextWithCode } from '@features/worksheet/components/CodeBlock/parseTextWithCode';
import styles from './CategorySection.module.css';
import { strings } from '@features/worksheet/config/strings';
import type { Category } from '@worksheet/worksheetModel';

interface CategorySectionProps {
  block: Category;
  taskCounterRef: RefObject<number>;
}

const categoryConfig = {
  info: {
    label: strings.categories.info,
    icon: Info,
  },
  checkpoint: {
    label: strings.categories.checkpoint,
    icon: Flag,
  },
  core: {
    label: strings.categories.core,
    icon: Target,
  },
  challenge: {
    label: strings.categories.challenge,
    icon: Zap,
  },
} satisfies Record<Category["kind"], { label: string; icon: typeof Info }>;

export function CategorySection({ block, taskCounterRef }: CategorySectionProps) {
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
          {parseTextWithCode(block.text, styles.bodyText)}
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
                taskCounterRef={taskCounterRef}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
