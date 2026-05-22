import type { ReactNode } from "react";

export type MacroRenderContext = {
  storageKey?: string | undefined;
  taskNumber?: string | number | undefined;
  checkTrigger?: number | undefined;
  readOnly?: boolean | undefined;
  projector?: boolean | undefined;
  onAttemptedChange?: ((taskKey: string, attempted: boolean) => void) | undefined;
  detailedFeedback?: boolean | undefined;
};

export type MacroComponentProps<TMacro> = {
  macro: TMacro;
  context: MacroRenderContext;
};

export type MacroComponent<TMacro> = (
  props: MacroComponentProps<TMacro>
) => ReactNode;
