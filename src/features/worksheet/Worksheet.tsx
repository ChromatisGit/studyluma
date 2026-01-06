"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { CategorySection } from "./components/CategorySection/CategorySection";
import styles from "./Worksheet.module.css";
import type { Category } from "@features/worksheet/worksheetModel";
import { WorksheetStorage } from "./storage/WorksheetStorage";
import { WorksheetStorageProvider } from "./storage/WorksheetStorageContext";

interface WorksheetContainerProps {
  content: Category[];
  title?: string;
}

export function Worksheet({ content, title }: WorksheetContainerProps) {
  const [storage, setStorage] = useState<WorksheetStorage | null>(null);
  const pathname = usePathname();

  const worksheetSignature = useMemo(
    () => WorksheetStorage.computeSignature({ title, content }),
    [title, content]
  );

  const taskNumbers = useMemo(() => {
    const numbers: Record<string, number> = {};
    let nextNumber = 1;

    content.forEach((block, categoryIndex) => {
      if (block.kind === 'info' || block.kind === 'checkpoint') return;

      block.items.forEach((item, itemIndex) => {
        if (item.kind !== 'taskSet') return;

        numbers[`${categoryIndex}-${itemIndex}`] = nextNumber;
        nextNumber += 1;
      });
    });

    return numbers;
  }, [content]);

  useEffect(() => {
    if (!WorksheetStorage.isAvailable()) {
      setStorage(null);
      return;
    }

    const instance = WorksheetStorage.forWorksheet(pathname || "worksheet", worksheetSignature);
    setStorage(instance);
  }, [pathname, worksheetSignature]);

  const worksheetInstanceKey = storage?.worksheetId ?? "worksheet";

  return (
    <WorksheetStorageProvider storage={storage}>
      <div className={styles.sheet} key={worksheetInstanceKey}>
        <div className={styles.categoryList}>
          {content.map((block, index) => (
            <CategorySection
              key={index}
              block={block}
              categoryIndex={index}
              taskNumbers={taskNumbers}
            />
          ))}
        </div>
      </div>
    </WorksheetStorageProvider>
  );
}
