const MIN_PER_ROW = 3;
const MAX_PER_ROW = 4;

function buildRowsFromSizes<T>(items: T[], sizes: number[]): T[][] {
  const rows: T[][] = [];
  let index = 0;

  for (const size of sizes) {
    rows.push(items.slice(index, index + size));
    index += size;
  }

  return rows;
}

/**
 * Chunks items into rows that prefer 3 or 4 columns where possible.
 */
export function chunkSections<T>(items: T[]): T[][] {
  if (items.length === 0) return [];

  const minRows = Math.ceil(items.length / MAX_PER_ROW);
  const maxRows = Math.ceil(items.length / MIN_PER_ROW);

  for (let rows = minRows; rows <= maxRows; rows++) {
    const base = Math.floor(items.length / rows);
    const extra = items.length % rows;
    const minSize = base;
    const maxSize = base + (extra > 0 ? 1 : 0);

    if (minSize >= MIN_PER_ROW && maxSize <= MAX_PER_ROW) {
      const sizes = Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
      return buildRowsFromSizes(items, sizes);
    }
  }

  // Fallback: simple balancing with a max of 4 per row (may produce smaller final rows for low counts)
  const fallbackRows = Math.max(1, Math.ceil(items.length / MAX_PER_ROW));
  const fallbackBase = Math.floor(items.length / fallbackRows);
  const fallbackExtra = items.length % fallbackRows;
  const fallbackSizes = Array.from(
    { length: fallbackRows },
    (_, i) => fallbackBase + (i < fallbackExtra ? 1 : 0)
  );

  return buildRowsFromSizes(items, fallbackSizes);
}
