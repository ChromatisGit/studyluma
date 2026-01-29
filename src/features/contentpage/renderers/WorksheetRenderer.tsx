"use client";

import clsx from "clsx";
import type { Page, Node } from "@schema/page";
import type { Macro } from "@schema/macroTypes";
import { CategorySection, type Category } from "@features/contentpage/components/CategorySection/CategorySection";
import type { InfoBlock } from "@features/contentpage/components/InfoBlock/InfoBlock";
import type { TaskSet } from "@features/contentpage/components/Group/TaskSetComponent";
import { getCategoryType } from "@features/contentpage/config/categoryConfig";
import { WorksheetStorageProvider } from "@features/contentpage/storage/WorksheetStorageContext";
import { PageHeader } from "@components/PageHeader/PageHeader";
import styles from "./WorksheetRenderer.module.css";

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

    if (categoryType === 'info') {
      // Info category: single card with title and text
      const textContent = extractTextFromNodes(section.content);
      categories.push({
        kind: 'info',
        title: section.header,
        text: textContent,
      });
    } else {
      // Task category: contains InfoBlocks and TaskSets
      const items: Array<InfoBlock | TaskSet> = [];

      for (const node of section.content ?? []) {
        // Convert nodes to either InfoBlock or TaskSet
        if ('markdown' in node) {
          // Plain text becomes an info block
          items.push({
            kind: 'info',
            title: '',
            text: node.markdown,
          });
        } else if ('type' in node && node.type === 'group') {
          // Group becomes a TaskSet
          items.push({
            kind: 'taskSet',
            intro: node.intro,
            tasks: node.macros,
          });
        } else if ('type' in node) {
          // Single macro becomes a TaskSet with one task
          items.push({
            kind: 'taskSet',
            tasks: [node as Macro],
          });
        }
      }

      categories.push({
        kind: categoryType,
        items,
      });
    }
  }

  return categories;
}

/**
 * Extracts text content from nodes for info categories
 */
function extractTextFromNodes(nodes: Node[]): string {
  return nodes
    .map(node => {
      if ('markdown' in node) {
        return node.markdown;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
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
