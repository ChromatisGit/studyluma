export function fancyRows(count: number, maxSize: number): number[] {
  if (count <= 0) return [];
  if (count <= maxSize) return [count];

  const rows = Math.ceil(count / maxSize);
  const base = Math.floor(count / rows);
  const extra = count % rows;

  return [
    ...Array(extra).fill(base + 1),
    ...Array(rows - extra).fill(base),
  ];
}

export function chunkBySizes<T>(items: readonly T[], sizes: readonly number[]): T[][] {
  const out: T[][] = [];
  let index = 0;

  for (const size of sizes) {
    out.push(items.slice(index, index + size) as T[]);
    index += size;
  }

  return out;
}
