/**
 * Central Macro Registry (Client-side)
 *
 * This file exports types and rendering utilities for client components.
 * For parsing (server-side), see pipeline/pageParser/macros/macroRegistry.ts
 *
 * To add a new macro:
 * 1. Create folder src/macros/[name]/ with types.ts, parser.ts, Renderer.tsx
 * 2. Add type import and component import below
 * 3. Add entry to the macros object
 */
import type { ReactNode, ComponentType } from "react";
import type { MacroRenderContext, MacroComponentProps } from "./componentTypes";

// ============================================================================
// TYPE IMPORTS - Add new macro type imports here
// ============================================================================

import type { NoteMacro } from "./note/types";
import type { HighlightMacro } from "./highlight/types";
import type { ImageMacro } from "./image/types";
import type { TableMacro } from "./table/types";
import type { CodeRunnerMacro } from "./codeRunner/types";
import type { GapMacro } from "./gap/types";
import type { McqMacro } from "./mcq/types";
import type { CodeTaskMacro } from "./codeTask/types";
import type { TextTaskMacro } from "./textTask/types";
import type { MathTaskMacro } from "./mathTask/types";

// ============================================================================
// COMPONENT IMPORTS - Add new macro component imports here
// ============================================================================

import NoteRenderer from "./note/Renderer";
import HighlightRenderer from "./highlight/Renderer";
import ImageRenderer from "./image/Renderer";
import TableRenderer from "./table/Renderer";
import CodeRunnerRenderer from "./codeRunner/Renderer";
import GapRenderer from "./gap/Renderer";
import McqRenderer from "./mcq/Renderer";
import CodeTaskRenderer from "./codeTask/Renderer";
import TextTaskRenderer from "./textTask/Renderer";
import MathTaskRenderer from "./mathTask/Renderer";

// ============================================================================
// MACRO TYPE (union of all macro types)
// ============================================================================

export type Macro =
  | NoteMacro
  | HighlightMacro
  | ImageMacro
  | TableMacro
  | CodeRunnerMacro
  | GapMacro
  | McqMacro
  | CodeTaskMacro
  | TextTaskMacro
  | MathTaskMacro;

export type MacroType = Macro["type"];

// ============================================================================
// REGISTRY - Add 1 entry per macro
// ============================================================================

const macros = {
  note: { Component: NoteRenderer, category: "display" as const },
  highlight: { Component: HighlightRenderer, category: "display" as const },
  image: { Component: ImageRenderer, category: "display" as const },
  table: { Component: TableRenderer, category: "display" as const },
  codeRunner: { Component: CodeRunnerRenderer, category: "display" as const },
  gap: { Component: GapRenderer, category: "input" as const },
  mcq: { Component: McqRenderer, category: "input" as const },
  codeTask: { Component: CodeTaskRenderer, category: "input" as const },
  textTask: { Component: TextTaskRenderer, category: "input" as const },
  mathTask: { Component: MathTaskRenderer, category: "input" as const },
};

type MacroName = keyof typeof macros;

// ============================================================================
// AUTO-DERIVED ARRAYS
// ============================================================================

const entries = Object.entries(macros) as [MacroName, (typeof macros)[MacroName]][];

export const DISPLAY_MACRO_TYPES = entries
  .filter(([, m]) => m.category === "display")
  .map(([n]) => n);

export const INPUT_MACRO_TYPES = entries
  .filter(([, m]) => m.category === "input")
  .map(([n]) => n);

export const ALL_MACRO_TYPES = [...DISPLAY_MACRO_TYPES, ...INPUT_MACRO_TYPES];

// ============================================================================
// TYPE GUARDS
// ============================================================================

const displaySet = new Set(DISPLAY_MACRO_TYPES);
const inputSet = new Set(INPUT_MACRO_TYPES);

export const isDisplayMacro = (m: Macro) => displaySet.has(m.type);
export const isInputMacro = (m: Macro) => inputSet.has(m.type);

// ============================================================================
// TASK KEY BUILDER
// ============================================================================

function extractText(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "markdown" in v) return (v as { markdown: string }).markdown;
  return "";
}

function normalizeTaskKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 40);
}

export function buildTaskKey(macro: Macro, index: number): string {
  for (const field of ["instruction", "question", "content"]) {
    if (field in macro) {
      const key = normalizeTaskKey(extractText((macro as Record<string, unknown>)[field]));
      if (key) return key;
    }
  }
  return `${macro.type}-${index}`;
}

// ============================================================================
// RENDERER (frontend)
// ============================================================================

type AnyMacroComponent = ComponentType<{ macro: Macro; context: MacroRenderContext }>;
const componentMap = new Map<string, AnyMacroComponent>(
  entries.map(([n, m]) => [n, m.Component as AnyMacroComponent])
);

export function renderMacro(
  macro: Macro,
  context: MacroRenderContext,
  key?: string | number
): ReactNode {
  const C = componentMap.get(macro.type);
  return C ? <C key={key} macro={macro} context={context} /> : null;
}

export type { MacroRenderContext, MacroComponentProps };
