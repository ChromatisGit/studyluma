import type { Markdown } from "@domain/page";

/**
 * Extracts the raw text string from a Markdown object or returns the string as-is.
 * Returns null if the value is null, undefined, or not a valid text format.
 */
export function getMarkdown(value: Markdown | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "markdown" in value) {
    const raw = (value as { markdown?: unknown }).markdown;
    return typeof raw === "string" ? raw : null;
  }
  return null;
}
