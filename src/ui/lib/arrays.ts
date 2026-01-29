type BalancedChunkConfig = {
  minPerRow: number;
  maxPerRow: number;
};

function buildRowsFromSizes<T>(items: T[], sizes: number[]): T[][] {
  const rows: T[][] = [];
  let index = 0;

  for (const size of sizes) {
    rows.push(items.slice(index, index + size));
    index += size;
  }

  return rows;
}

export function chunkBySize<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) return [];

  const size = Math.max(1, Math.floor(chunkSize));
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
}

/**
 * Chunks items into balanced rows where each row length stays between `minPerRow` and `maxPerRow` when possible.
 */
export function chunkBalanced<T>(items: T[], { minPerRow, maxPerRow }: BalancedChunkConfig): T[][] {
  if (items.length === 0) return [];

  const minRows = Math.ceil(items.length / maxPerRow);
  const maxRows = Math.ceil(items.length / minPerRow);

  for (let rows = minRows; rows <= maxRows; rows++) {
    const base = Math.floor(items.length / rows);
    const extra = items.length % rows;
    const minSize = base;
    const maxSize = base + (extra > 0 ? 1 : 0);

    if (minSize >= minPerRow && maxSize <= maxPerRow) {
      const sizes = Array.from({ length: rows }, (_, index) => base + (index < extra ? 1 : 0));
      return buildRowsFromSizes(items, sizes);
    }
  }

  const fallbackRows = Math.max(1, Math.ceil(items.length / maxPerRow));
  const fallbackBase = Math.floor(items.length / fallbackRows);
  const fallbackExtra = items.length % fallbackRows;
  const fallbackSizes = Array.from(
    { length: fallbackRows },
    (_, index) => fallbackBase + (index < fallbackExtra ? 1 : 0)
  );

  return buildRowsFromSizes(items, fallbackSizes);
}

export function chunkPrefer3Or4<T>(items: T[]): T[][] {
  return chunkBalanced(items, { minPerRow: 3, maxPerRow: 4 });
}

