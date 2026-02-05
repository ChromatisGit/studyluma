import type { ReactNode } from "react";

export type MacroRenderContext = {
  /**
   * For input macros: enables state persistence when true.
   * When false, macro is still interactive but state is ephemeral.
   */
  persistState: boolean;

  /**
   * Unique key for storage (e.g., "worksheet-123-task-5").
   * Only used when persistState is true.
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
};

export type MacroComponentProps<TMacro> = {
  macro: TMacro;
  context: MacroRenderContext;
};

export type MacroComponent<TMacro> = (
  props: MacroComponentProps<TMacro>
) => ReactNode;
