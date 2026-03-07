/**
 * Minimal inline markdown renderer for UI components that cannot import
 * MarkdownRenderer from features/contentpage.
 *
 * Handles the subset of markdown used in quiz/practice task options:
 * - Inline code:  `code`
 * - Bold:         **text**
 * - Plain text (everything else)
 */
import type { ReactNode } from "react";

const INLINE_RE = /(`[^`]+`|\*\*[^*]+\*\*)/g;

export function renderInlineMarkdown(text: string): ReactNode {
  const parts = text.split(INLINE_RE);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
