import type { Markdown } from "@schema/page";

export type HandwrittenTaskMacro = {
  type: "handwrittenTask";
  instruction: Markdown;
  hint?: Markdown;
  /** Final answer only - always shown once checked. Worked calculation steps
   *  belong in `why` instead, which is meant to be gated behind a
   *  teacher-controlled unlock once that feature exists (see
   *  `MacroRenderContext.solutionsUnlocked`) - not implemented yet, so the
   *  renderer currently shows `why` unconditionally once checked. */
  answer?: Markdown;
  why?: Markdown;
  space?: "s" | "m" | "l" | "page";
  grid?: "squares" | "lines" | "free";
};
