'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { toast } from 'sonner';
import { useWorksheetStorage } from '@features/contentpage/storage/WorksheetStorageContext';
import type { ProgressStatus } from '@schema/courseTypes';
import { CategorySection, type Category } from '@features/contentpage/components/CategorySection/CategorySection';
import { CheckpointOverlay } from '@features/contentpage/components/CheckpointOverlay/CheckpointOverlay';
import { PageNavBar } from '@features/contentpage/components/PageNavBar/PageNavBar';
import { WorksheetPdfCard } from '@features/contentpage/components/WorksheetPdfCard/WorksheetPdfCard';
import CONTENTPAGE_TEXT from '@features/contentpage/contentpage.de.json';
import styles from './WorksheetNavigator.module.css';

interface WorksheetNavigatorProps {
  categories: Category[];
  chapterStatus: ProgressStatus;
  taskNumbers: Record<string, number>;
  courseId?: string | undefined;
  worksheetId?: string | undefined;
}

export function WorksheetNavigator({ categories, chapterStatus, taskNumbers, courseId, worksheetId }: WorksheetNavigatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [triggerCheck, setTriggerCheck] = useState(0);
  const presenceFetcher = useFetcher();
  const presenceSubmitRef = useRef(presenceFetcher.submit);

  useEffect(() => {
    presenceSubmitRef.current = presenceFetcher.submit;
  }, [presenceFetcher.submit]);

  useEffect(() => {
    if (!courseId || !worksheetId) return;
    const formData = new FormData();
    formData.set('intent', 'presence');
    formData.set('courseId', courseId);
    formData.set('sectionIndex', String(currentIndex));
    void presenceSubmitRef.current(formData, {
      method: 'POST',
      action: `/api/worksheet/${worksheetId}/presence`,
    });
  }, [courseId, worksheetId, currentIndex]);

  useEffect(() => {
    setTriggerCheck(0);
  }, [currentIndex]);

  // Track which sections are "done" (nav condition met). Sections with no task
  // sets to compare (info-only) or PDF sections (solutions are already visible
  // on the page itself - no compare-to-solution step makes sense there) start
  // out completed; everything else needs the page-level compare button clicked.
  const [completedSections, setCompletedSections] = useState<ReadonlySet<number>>(() => {
    const initial = new Set<number>();
    categories.forEach((cat, i) => {
      if (cat.isPdf || (cat.kind !== 'checkpoint' && !cat.items.some(item => item.kind === 'taskSet'))) {
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

  const storage = useWorksheetStorage();
  const isActive = chapterStatus === 'current';

  const category = categories[currentIndex];
  const canGoBack = currentIndex > 0;
  const canGoNext = !isActive || completedSections.has(currentIndex);

  const navText = CONTENTPAGE_TEXT.navigation;
  const lockedReason = category?.kind === 'checkpoint'
    ? navText.lockedCheckpointReason
    : navText.lockedTasksReason;

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const goBack = () => {
    if (!canGoBack) return;
    void storage?.flush();
    setCurrentIndex(prev => prev - 1);
    scrollToTop();
  };

  const goNext = () => {
    if (currentIndex >= categories.length - 1) return;
    if (!canGoNext) {
      toast.error(lockedReason);
      return;
    }
    void storage?.flush();
    setCurrentIndex(prev => prev + 1);
    scrollToTop();
  };

  const handleCompare = () => {
    setTriggerCheck(prev => prev + 1);
    markSectionCompleted(currentIndex);
  };

  const showNavBar = categories.length > 1;
  const hasTaskSets = category?.items.some(item => item.kind === 'taskSet') ?? false;
  const showCompareButton = hasTaskSets && !category?.isPdf;

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

      {category.isPdf && (
        <WorksheetPdfCard pdfUrl={category.pdfUrl} pdfFileName={category.pdfFileName} />
      )}

      <CategorySection
        key={currentIndex}
        block={category}
        categoryIndex={currentIndex}
        taskNumbers={taskNumbers}
        triggerCheck={triggerCheck}
      />

      {category.kind === 'checkpoint' && isActive && (
        <CheckpointOverlay
          sectionIndex={currentIndex}
          onSubmitted={() => markSectionCompleted(currentIndex)}
        />
      )}

      {showCompareButton && (
        <div className={styles.compareActions}>
          <button type="button" onClick={handleCompare} className={styles.compareButton}>
            {CONTENTPAGE_TEXT.buttons.checkSolution}
          </button>
        </div>
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
