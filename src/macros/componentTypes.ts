import type { ReactNode } from "react";

export type MacroRenderContext = {
  /**
   * Unique key for storage (e.g., "worksheet-123-task-5").
   * Used by useMacroValue() to identify this macro's state.
   */
  storageKey?: string;

  /**
   * Optional task numbering for display (e.g., "1", "2a", "2b").
   * Used by worksheet renderer for numbered tasks.
   */
  taskNumber?: string | number;

  /**
   * Optional check trigger - incremented to trigger validation.
   * Used to coordinate "Check Solution" buttons across tasks.
   */
  checkTrigger?: number;

  /**
   * Whether interactive macros (e.g. codeRunner) are read-only.
   * Defaults to true. Set to false in slides presenter to allow editing.
   */
  readOnly?: boolean;

  /**
   * When true, the macro is being rendered on the projector screen.
   * Some macros (e.g. quiz) should hide themselves entirely on the projector.
   */
  projector?: boolean;

  /**
   * Called when the macro's "attempted" state changes (i.e. whether the user
   * has entered any content). Used by TaskSetComponent to track section completion.
   */
  onAttemptedChange?: (taskKey: string, attempted: boolean) => void;

  /**
   * When true, show detailed per-option feedback after checking (correct/wrong/missed
   * highlighted per option). Used by PracticeRenderer.
   * When false (default), only indicate that something is wrong without revealing which options.
   */
  detailedFeedback?: boolean;
};

export type MacroComponentProps<TMacro> = {
  macro: TMacro;
  context: MacroRenderContext;
};

export type MacroComponent<TMacro> = (
  props: MacroComponentProps<TMacro>
) => ReactNode;
