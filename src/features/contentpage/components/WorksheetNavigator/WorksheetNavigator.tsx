'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { updatePresenceAction } from '@actions/worksheetActions';
import { useWorksheetStorage } from '@features/contentpage/storage/WorksheetStorageContext';
import type { ProgressStatus } from '@schema/courseTypes';
import { CategorySection, type Category } from '@features/contentpage/components/CategorySection/CategorySection';
import { CheckpointOverlay } from '@features/contentpage/components/CheckpointOverlay/CheckpointOverlay';
import { PageNavBar } from '@features/contentpage/components/PageNavBar/PageNavBar';
import CONTENTPAGE_TEXT from '@features/contentpage/contentpage.de.json';
import styles from './WorksheetNavigator.module.css';

interface WorksheetNavigatorProps {
  categories: Category[];
  chapterStatus: ProgressStatus;
  taskNumbers: Record<string, number>;
  courseId?: string;
  worksheetId?: string;
}

export function WorksheetNavigator({ categories, chapterStatus, taskNumbers, courseId, worksheetId }: WorksheetNavigatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!courseId || !worksheetId) return;
    void updatePresenceAction(courseId, worksheetId, currentIndex);
  }, [courseId, worksheetId, currentIndex]);

  // Track which sections are "done" (nav condition met)
  const [completedSections, setCompletedSections] = useState<ReadonlySet<number>>(() => {
    const initial = new Set<number>();
    categories.forEach((cat, i) => {
      if (cat.kind !== 'checkpoint' && !cat.items.some(item => item.kind === 'taskSet')) {
        initial.add(i);
      }
    });
    return initial;
  });

  const markSectionCompleted = useCallback((index: number) => {
    setCompletedSections(prev => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  // Track task set completions per section: Map<sectionIndex, Set<itemIndex>>
  const taskSetCompletionsRef = useRef<Map<number, Set<number>>>(new Map());

  const handleTaskSetCompleted = useCallback((sectionIndex: number, itemIndex: number) => {
    const sectionMap = taskSetCompletionsRef.current.get(sectionIndex) ?? new Set<number>();
    sectionMap.add(itemIndex);
    taskSetCompletionsRef.current.set(sectionIndex, sectionMap);

    const section = categories[sectionIndex];
    if (!section || section.kind === 'checkpoint') return;

    const expectedCount = section.items.filter(i => i.kind === 'taskSet').length;
    if (sectionMap.size >= expectedCount) {
      markSectionCompleted(sectionIndex);
    }
  }, [categories, markSectionCompleted]);

  const storage = useWorksheetStorage();
  const isActive = chapterStatus === 'current';

  const canGoBack = currentIndex > 0;
  const canGoNext = !isActive || completedSections.has(currentIndex);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const goBack = () => {
    if (!canGoBack) return;
    void storage?.flush();
    setCurrentIndex(prev => prev - 1);
    scrollToTop();
  };

  const goNext = () => {
    if (!canGoNext || currentIndex >= categories.length - 1) return;
    void storage?.flush();
    setCurrentIndex(prev => prev + 1);
    scrollToTop();
  };

  const showNavBar = categories.length > 1;
  const category = categories[currentIndex];

  const navText = CONTENTPAGE_TEXT.navigation;
  const lockedReason = category?.kind === 'checkpoint'
    ? navText.lockedCheckpointReason
    : navText.lockedTasksReason;

  if (!category) return null;

  return (
    <div className={styles.navigator}>
      {showNavBar && (
        <PageNavBar
          onBack={goBack}
          onNext={goNext}
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          currentIndex={currentIndex}
          totalSections={categories.length}
          lockedReason={lockedReason}
        />
      )}

      <CategorySection
        key={currentIndex}
        block={category}
        categoryIndex={currentIndex}
        taskNumbers={taskNumbers}
        onTaskSetCompleted={
          category.kind !== 'checkpoint'
            ? (itemIndex) => handleTaskSetCompleted(currentIndex, itemIndex)
            : undefined
        }
      />

      {category.kind === 'checkpoint' && isActive && (
        <CheckpointOverlay
          sectionIndex={currentIndex}
          onSubmitted={() => markSectionCompleted(currentIndex)}
        />
      )}

      {showNavBar && (
        <PageNavBar
          onBack={goBack}
          onNext={goNext}
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          currentIndex={currentIndex}
          totalSections={categories.length}
          lockedReason={lockedReason}
        />
      )}
    </div>
  );
}
