import type { Macro } from "@schema/macroTypes";

/**
 * Context passed to every macro component
 */
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

/**
 * Props for macro components
 */
export type MacroComponentProps<T extends Macro = Macro> = {
  macro: T;
  context: MacroRenderContext;
};

/**
 * Type for a macro component function
 */
export type MacroComponent<T extends Macro = Macro> = (
  props: MacroComponentProps<T>
) => React.ReactNode;
