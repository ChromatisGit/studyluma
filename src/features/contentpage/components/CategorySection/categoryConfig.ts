/**
 * Configuration for mapping section headers to category types.
 * Case-insensitive matching for German worksheet headers.
 */

export const CATEGORY_HEADERS = {
  checkpoint: ['checkpoint'],
  core: ['aufgaben', 'tasks'],
  challenge: ['challenges', 'challenge'],
} as const;

export type CategoryType = 'checkpoint' | 'core' | 'challenge';

/**
 * Determines the category type based on a section header.
 * Returns 'core' for any header that doesn't match known categories.
 *
 * @param header - The section header text
 * @returns The category type
 */
export function getCategoryType(header: string): CategoryType {
  const normalized = header.toLowerCase().trim();

  if (CATEGORY_HEADERS.checkpoint.some(h => normalized.includes(h))) {
    return 'checkpoint';
  }

  if (CATEGORY_HEADERS.core.some(h => normalized.includes(h))) {
    return 'core';
  }

  if (CATEGORY_HEADERS.challenge.some(h => normalized.includes(h))) {
    return 'challenge';
  }

  return 'core';
}
