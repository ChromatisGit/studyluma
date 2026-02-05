export const CODE_LANGUAGES = ["ts"] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export function isCodeLanguage(value: string): value is CodeLanguage {
  return CODE_LANGUAGES.includes(value as CodeLanguage);
}
