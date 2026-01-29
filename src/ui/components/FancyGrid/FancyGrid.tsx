"use client";

import { useMemo, type ReactNode } from "react";

import { chunkBySizes, fancyRows } from "@ui/lib/fancyGrid";
import { useResponsiveCols } from "@ui/lib/useResponsiveCols";

export type FancyGridProps<T> = {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  minItemWidth: number;
  gap: number;
  maxCols: number;
  className?: string;
  rowClassName?: string;
};

export function FancyGrid<T>({
  items,
  renderItem,
  minItemWidth,
  gap,
  maxCols,
  className,
  rowClassName,
}: FancyGridProps<T>) {
  const { ref, cols } = useResponsiveCols({ minItemWidth, gap, maxCols });
  const sizes = useMemo(() => fancyRows(items.length, cols), [items.length, cols]);
  const rows = useMemo(() => chunkBySizes(items, sizes), [items, sizes]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: `${gap}px` }}
    >
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={rowClassName}
          style={{
            display: "grid",
            gap: `${gap}px`,
            gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
          }}
        >
          {row.map((item, columnIndex) => {
            const index =
              rows.slice(0, rowIndex).reduce((acc, nextRow) => acc + nextRow.length, 0) +
              columnIndex;
            return <div key={index}>{renderItem(item, index)}</div>;
          })}
        </div>
      ))}
    </div>
  );
}
