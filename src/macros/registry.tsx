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
import type { CardMacro } from "./card/types";
import type { PairsMacro } from "./pairs/types";
import type { ImageMacro } from "./image/types";
import type { TableMacro } from "./table/types";
import type { CodeRunnerMacro } from "./codeRunner/types";
import type { GapMacro } from "./gap/types";
import type { McqMacro } from "./mcq/types";
import type { QuizMacro } from "./quiz/types";
import type { CodeTaskMacro } from "./codeTask/types";
import type { TextTaskMacro } from "./textTask/types";
import type { PresenterNoteMacro } from "./pn/types";
import type { LayoutMacro } from "./layout/types";

// ============================================================================
// COMPONENT IMPORTS - Add new macro component imports here
// ============================================================================

import NoteRenderer from "./note/Renderer";
import CardRenderer from "./card/Renderer";
import PairsRenderer from "./pairs/Renderer";
import ImageRenderer from "./image/Renderer";
import TableRenderer from "./table/Renderer";
import CodeRunnerRenderer from "./codeRunner/Renderer";
import GapRenderer from "./gap/Renderer";
import McqRenderer from "./mcq/Renderer";
import QuizRenderer from "./quiz/Renderer";
import CodeTaskRenderer from "./codeTask/Renderer";
import TextTaskRenderer from "./textTask/Renderer";
import LayoutRenderer from "./layout/Renderer";

// ============================================================================
// MACRO TYPE (union of all macro types)
// ============================================================================

export type Macro =
  | NoteMacro
  | CardMacro
  | PairsMacro
  | ImageMacro
  | TableMacro
  | CodeRunnerMacro
  | GapMacro
  | McqMacro
  | CodeTaskMacro
  | TextTaskMacro
  | PresenterNoteMacro
  | LayoutMacro
  | QuizMacro;

export type MacroType = Macro["type"];

// ============================================================================
// REGISTRY - Add 1 entry per macro
// ============================================================================

const macros = {
  layout: { Component: LayoutRenderer, category: "display" as const, state: "none" as const },
  note: { Component: NoteRenderer, category: "display" as const, state: "none" as const },
  card: { Component: CardRenderer, category: "display" as const, state: "none" as const },
  pairs: { Component: PairsRenderer, category: "display" as const, state: "none" as const },
  image: { Component: ImageRenderer, category: "display" as const, state: "none" as const },
  table: { Component: TableRenderer, category: "display" as const, state: "none" as const },
  codeRunner: { Component: CodeRunnerRenderer, category: "display" as const, state: "interactive" as const },
  gap: { Component: GapRenderer, category: "input" as const, state: "interactive" as const },
  mcq: { Component: McqRenderer, category: "input" as const, state: "interactive" as const },
  quiz: { Component: QuizRenderer, category: "display" as const, state: "none" as const },
  codeTask: { Component: CodeTaskRenderer, category: "input" as const, state: "interactive" as const },
  textTask: { Component: TextTaskRenderer, category: "input" as const, state: "interactive" as const },
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

export const INTERACTIVE_MACRO_TYPES = entries
  .filter(([, m]) => m.state === "interactive")
  .map(([n]) => n);

// ============================================================================
// TYPE GUARDS
// ============================================================================

const displaySet = new Set(DISPLAY_MACRO_TYPES);
const inputSet = new Set(INPUT_MACRO_TYPES);

export const isDisplayMacro = (m: Macro) => displaySet.has(m.type as MacroName);
export const isInputMacro = (m: Macro) => inputSet.has(m.type as MacroName);

// ============================================================================
// TASK KEY BUILDER
// ============================================================================

function extractText(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "markdown" in v) return (v as { markdown: string }).markdown;
  return "";
}

function hashTaskText(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function buildTaskKey(macro: Macro, index: number): string {
  for (const field of ["instruction", "question", "content"]) {
    if (field in macro) {
      const text = extractText((macro as Record<string, unknown>)[field]).trim();
      if (text) return hashTaskText(text);
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
