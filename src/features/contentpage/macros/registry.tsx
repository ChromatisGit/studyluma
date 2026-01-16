import type { Macro } from "@domain/macroTypes";
import type { MacroRenderContext } from "./types";
import type { ComponentType } from "react";

// Display macros (stateless)
import { NoteMacro } from "./display/NoteMacro";
import { HighlightMacro } from "./display/HighlightMacro";
import { CodeRunnerMacro } from "./display/CodeRunnerMacro";
import { TableMacro } from "./display/TableMacro";
import { ImageMacro } from "./display/ImageMacro";

// Input macros (can persist state)
import { GapMacro } from "./input/GapMacro";
import { McqMacro } from "./input/McqMacro";
import { CodeTaskMacro } from "./input/CodeTaskMacro";
import { TextTaskMacro } from "./input/TextTaskMacro";
import { MathTaskMacro } from "./input/MathTaskMacro";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMacroComponent = ComponentType<{ macro: any; context: MacroRenderContext }>;

/**
 * Registry mapping macro types to their render components
 */
const macroComponents: Record<Macro["type"], AnyMacroComponent> = {
  // Display macros
  note: NoteMacro,
  highlight: HighlightMacro,
  codeRunner: CodeRunnerMacro,
  table: TableMacro,
  image: ImageMacro,
  // Input macros
  gap: GapMacro,
  mcq: McqMacro,
  codeTask: CodeTaskMacro,
  textTask: TextTaskMacro,
  mathTask: MathTaskMacro,
};

/**
 * Render a macro using the component registry
 */
export function renderMacro(
  macro: Macro,
  context: MacroRenderContext,
  key?: string | number
): React.ReactNode {
  const Component = macroComponents[macro.type];
  return <Component key={key} macro={macro} context={context} />;
}

export type { MacroRenderContext };
