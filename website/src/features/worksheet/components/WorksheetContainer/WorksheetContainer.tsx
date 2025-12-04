import { useRef } from 'react';
import { CategorySection } from '@features/worksheet/components/CategorySection/CategorySection';
import styles from './WorksheetContainer.module.css';
import type { Category } from '@worksheet/worksheetModel';

interface WorksheetContainerProps {
  content: Category[];
}

export function WorksheetContainer({ content }: WorksheetContainerProps) {
  // Use a ref to maintain task counter across all categories
  const taskCounterRef = useRef(1);

  return (
    <div className={styles.sheet}>
      <div className={styles.categoryList}>
        {content.map((block, index) => (
          <CategorySection key={index} block={block} taskCounterRef={taskCounterRef} />
        ))}
      </div>
    </div>
  );
}
