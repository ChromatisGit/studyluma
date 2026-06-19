import type { ReactNode } from "react";

export type MacroRenderContext = {
  storageKey?: string | undefined;
  taskNumber?: string | number | undefined;
  checkTrigger?: number | undefined;
  readOnly?: boolean | undefined;
  projector?: boolean | undefined;
  onAttemptedChange?: ((taskKey: string, attempted: boolean) => void) | undefined;
  detailedFeedback?: boolean | undefined;
  pdfSection?: boolean | undefined;
  /** Future teacher-controlled gate for worked-solution content (e.g. a
   *  handwrittenTask's `why` calculation steps), not implemented yet -
   *  undefined/true means unlocked. Reserved so the unlock feature can be
   *  wired in later without touching every macro renderer. */
  solutionsUnlocked?: boolean | undefined;
};

export type MacroComponentProps<TMacro> = {
  macro: TMacro;
  context: MacroRenderContext;
};

export type MacroComponent<TMacro> = (
  props: MacroComponentProps<TMacro>
) => ReactNode;
