"use client";

import clsx from "clsx";
import type { Page } from "@schema/page";
import type { ProgressStatus } from "@schema/courseTypes";
import { type Macro, DISPLAY_MACRO_TYPES } from "@macros/registry";
import { type Category, type CategoryItem } from "@features/contentpage/components/CategorySection/CategorySection";
import { getCategoryType } from "@features/contentpage/components/CategorySection/categoryConfig";
import { WorksheetStorageProvider } from "@features/contentpage/storage/WorksheetStorageContext";
import { WorksheetNavigator } from "@features/contentpage/components/WorksheetNavigator/WorksheetNavigator";
import { PageHeader } from "@components/PageHeader/PageHeader";
import styles from "./WorksheetRenderer.module.css";

const DISPLAY_MACRO_TYPE_SET: ReadonlySet<string> = new Set(DISPLAY_MACRO_TYPES);

interface WorksheetRendererProps {
  page: Page;
  className?: string;
  worksheetSlug?: string;
  chapterStatus?: ProgressStatus;
  userId?: string;
  courseId?: string;
  worksheetId?: string;
}

/**
 * Converts Page sections to Category structure based on section headers.
 * Headers are matched case-insensitively to determine category type.
 */
function convertPageToCategories(page: Page): Category[] {
  const categories: Category[] = [];

  for (const section of page.content ?? []) {
    const categoryType = getCategoryType(section.header);
    const items: CategoryItem[] = [];

    for (const node of section.content ?? []) {
      if ('markdown' in node) {
        items.push({ kind: 'info', title: '', text: node.markdown });
      } else if ('type' in node && node.type === 'group') {
        items.push({ kind: 'taskSet', intro: node.intro, tasks: node.macros });
      } else if ('type' in node && node.type === 'subheader') {
        items.push({ kind: 'subheader', title: node.header.markdown });
      } else if ('type' in node && DISPLAY_MACRO_TYPE_SET.has(node.type)) {
        items.push({ kind: 'displayMacro', macro: node as Macro });
      } else if ('type' in node) {
        items.push({ kind: 'taskSet', tasks: [node as Macro] });
      }
    }

    categories.push({ kind: categoryType, items });
  }

  return categories;
}

/**
 * Computes task numbers for each category item, resetting to 1 at the start of each section.
 * Keys use the format `${categoryIndex}-${itemIndex}` to match CategorySection expectations.
 */
function computeTaskNumbers(categories: Category[]): Record<string, number> {
  const taskNumbers: Record<string, number> = {};

  categories.forEach((category, categoryIndex) => {
    let currentNumber = 1;
    category.items.forEach((item, itemIndex) => {
      if (item.kind === 'taskSet') {
        taskNumbers[`${categoryIndex}-${itemIndex}`] = currentNumber;
        currentNumber++;
      }
    });
  });

  return taskNumbers;
}

/**
 * WorksheetRenderer - renders worksheets one section at a time with Prev / Next navigation.
 * Automatically converts Page structure to Category structure based on section headers.
 *
 * Header matching (case-insensitive):
 * - "Checkpoint" → checkpoint category
 * - "Challenges" / "Challenge" → challenge category
 * - Anything else (incl. "Aufgaben" / "Tasks") → core category
 *
 * All sections are numbered independently starting at 1.
 * When chapterStatus is 'current': forward navigation is gated on task/checkpoint completion.
 * Otherwise (default 'finished'): free navigation with no restrictions.
 */
export function WorksheetRenderer({ page, className, worksheetSlug, chapterStatus = 'finished', userId, courseId, worksheetId }: WorksheetRendererProps) {
  const categories = convertPageToCategories(page);
  const taskNumbers = computeTaskNumbers(categories);

  return (
    <WorksheetStorageProvider worksheetSlug={worksheetSlug} worksheetId={worksheetId} pageContent={page.content} userId={userId}>
      <div className={clsx(styles.worksheet, className)}>
        {page.title && <PageHeader title={page.title} />}
        <WorksheetNavigator
          categories={categories}
          chapterStatus={chapterStatus}
          taskNumbers={taskNumbers}
          courseId={courseId}
          worksheetId={worksheetId}
        />
      </div>
    </WorksheetStorageProvider>
  );
}
