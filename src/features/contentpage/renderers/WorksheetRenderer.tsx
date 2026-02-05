"use client";

import clsx from "clsx";
import type { Page } from "@schema/page";
import { type Macro, DISPLAY_MACRO_TYPES } from "@macros/registry";
import { CategorySection, type Category, type CategoryItem } from "@features/contentpage/components/CategorySection/CategorySection";
import { getCategoryType } from "@features/contentpage/components/CategorySection/categoryConfig";
import { WorksheetStorageProvider } from "@features/contentpage/storage/WorksheetStorageContext";
import { PageHeader } from "@components/PageHeader/PageHeader";
import styles from "./WorksheetRenderer.module.css";

const DISPLAY_MACRO_TYPE_SET: ReadonlySet<string> = new Set(DISPLAY_MACRO_TYPES);

interface WorksheetRendererProps {
  page: Page;
  className?: string;
  worksheetSlug?: string;
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

    if (categoryType === 'info') {
      categories.push({ kind: 'info', title: section.header, items });
    } else {
      categories.push({ kind: categoryType, items });
    }
  }

  return categories;
}

/**
 * Computes task numbers for each category item
 */
function computeTaskNumbers(categories: Category[]): Record<string, number> {
  const taskNumbers: Record<string, number> = {};
  let currentNumber = 1;

  categories.forEach((category, categoryIndex) => {
    if (category.kind !== 'info' && category.kind !== 'checkpoint') {
      category.items.forEach((item, itemIndex) => {
        if (item.kind === 'taskSet') {
          taskNumbers[`${categoryIndex}-${itemIndex}`] = currentNumber;
          currentNumber++;
        }
      });
    }
  });

  return taskNumbers;
}

/**
 * WorksheetRenderer - renders content pages with interactive worksheet categories.
 * Automatically converts Page structure to Category structure based on section headers.
 *
 * Header matching (case-insensitive):
 * - "Checkpoint" → checkpoint category (no numbering)
 * - "Aufgaben" / "Tasks" → core category (numbered)
 * - "Challenges" / "Challenge" → challenge category (numbered)
 * - Anything else → info category (informational only)
 */
export function WorksheetRenderer({ page, className, worksheetSlug }: WorksheetRendererProps) {
  const categories = convertPageToCategories(page);
  const taskNumbers = computeTaskNumbers(categories);

  return (
    <WorksheetStorageProvider worksheetSlug={worksheetSlug} pageContent={page.content}>
      <div className={clsx(styles.worksheet, className)}>
        {page.title && <PageHeader title={page.title} />}
        <div className={styles.categoryList}>
          {categories.map((category, index) => (
            <CategorySection
              key={index}
              block={category}
              categoryIndex={index}
              taskNumbers={taskNumbers}
            />
          ))}
        </div>
      </div>
    </WorksheetStorageProvider>
  );
}
