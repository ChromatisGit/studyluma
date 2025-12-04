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

export type ProtectedCodeBlocks = {
  safeContent: string;
  fencedBlocks: string[];
  inlineBlocks: string[];
};

export function protectCodeBlocks(raw: string): ProtectedCodeBlocks {
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

  return { safeContent, fencedBlocks, inlineBlocks };
}

export function restoreCodeBlocks(
  value: string,
  protectedBlocks: Pick<ProtectedCodeBlocks, "fencedBlocks" | "inlineBlocks">
): string {
  const { fencedBlocks, inlineBlocks } = protectedBlocks;

  return value
    .replace(CODE_BLOCK_PLACEHOLDER_REGEX, (_, idx) => {
      const index = Number(idx);
      return fencedBlocks[index] ?? "";
    })
    .replace(INLINE_CODE_PLACEHOLDER_REGEX, (_, idx) => {
      const index = Number(idx);
      return inlineBlocks[index] ?? "";
    });
}
