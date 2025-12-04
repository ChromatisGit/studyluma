import { LucideIcon } from 'lucide-react';
import { IconContainer } from '@features/homepage/components/IconContainer';
import styles from '@features/homepage/components/InfoGrid.module.css';

export interface InfoCardItem {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  iconVariant?: 'square' | 'circle';
}

interface InfoGridProps {
  items: InfoCardItem[];
  iconVariant?: 'square' | 'circle';
}

/**
 * Generic grid for small icon + text info cards.
 */
export function InfoGrid({ items, iconVariant = 'square' }: InfoGridProps) {
  return (
    <div className={styles.grid}>
      {items.map((item) => {
        const Icon = item.icon;
        const variant = item.iconVariant ?? iconVariant;

        return (
          <div key={item.id} className={styles.card}>
            <IconContainer Icon={Icon} size="sm" variant={variant} />
            <h3 className={styles.title}>{item.title}</h3>
            <p className={styles.text}>{item.description}</p>
          </div>
        );
      })}
    </div>
  );
}
