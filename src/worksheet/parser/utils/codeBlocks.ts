export type RestoreCodeBlocks = (value: string) => string;

const FENCED_CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const INLINE_CODE_REGEX = /`[^`]*`/g;
const CODE_BLOCK_PLACEHOLDER_REGEX = /__CODE_BLOCK_(\d+)__/g;
const INLINE_CODE_PLACEHOLDER_REGEX = /__INLINE_CODE_(\d+)__/g;

function substituteWithPlaceholders(
  input: string,
  pattern: RegExp,
  store: string[],
  label: string
): string {
  return input.replace(pattern, (match) => {
    const index = store.length;
    store.push(match);
    return `__${label}_${index}__`;
  });
}

export function protectCodeBlocks(raw: string): {
  safeContent: string;
  restoreCodeBlocks: RestoreCodeBlocks;
} {
  const fencedBlocks: string[] = [];
  const inlineBlocks: string[] = [];

  const withFencedPlaceholders = substituteWithPlaceholders(
    raw,
    FENCED_CODE_BLOCK_REGEX,
    fencedBlocks,
    "CODE_BLOCK"
  );
  const safeContent = substituteWithPlaceholders(
    withFencedPlaceholders,
    INLINE_CODE_REGEX,
    inlineBlocks,
    "INLINE_CODE"
  );

  const restoreCodeBlocks: RestoreCodeBlocks = (value: string) =>
    value
      .replace(CODE_BLOCK_PLACEHOLDER_REGEX, (_, idx) => {
        const index = Number(idx);
        return fencedBlocks[index] ?? "";
      })
      .replace(INLINE_CODE_PLACEHOLDER_REGEX, (_, idx) => {
        const index = Number(idx);
        return inlineBlocks[index] ?? "";
      });

  return { safeContent, restoreCodeBlocks };
}
