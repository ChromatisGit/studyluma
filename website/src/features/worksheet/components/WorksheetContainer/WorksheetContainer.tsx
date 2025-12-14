import { useEffect, useMemo, useRef, useState } from 'react';
import { CategorySection } from '@features/worksheet/components/CategorySection/CategorySection';
import styles from './WorksheetContainer.module.css';
import type { Category } from '@worksheet/worksheetModel';
import { WorksheetStorage } from '@features/worksheet/storage/WorksheetStorage';
import { WorksheetStorageProvider } from '@features/worksheet/storage/WorksheetStorageContext';

interface WorksheetContainerProps {
  content: Category[];
  title?: string;
}

export function WorksheetContainer({ content, title }: WorksheetContainerProps) {
  // Use a ref to maintain task counter across all categories
  const taskCounterRef = useRef(1);
  const [storage, setStorage] = useState<WorksheetStorage | null>(null);

  const worksheetSignature = useMemo(
    () => WorksheetStorage.computeSignature({ title, content }),
    [title, content]
  );

  useEffect(() => {
    if (!WorksheetStorage.isAvailable()) {
      setStorage(null);
      return;
    }

    const slug =
      typeof window !== 'undefined' && window.location
        ? window.location.pathname
        : 'worksheet';

    const instance = WorksheetStorage.forWorksheet(slug, worksheetSignature);
    setStorage(instance);
  }, [worksheetSignature]);

  return (
    <WorksheetStorageProvider storage={storage}>
      <div className={styles.sheet}>
        <div className={styles.categoryList}>
          {content.map((block, index) => (
            <CategorySection key={index} block={block} taskCounterRef={taskCounterRef} />
          ))}
        </div>
      </div>
    </WorksheetStorageProvider>
  );
}
