import type { Macro } from "./macroTypes";

/**
 * Input Macros: User can enter data that gets persisted
 * These macros accept user input (selections, text, code) that can be saved
 * when rendered in a context with persistence (e.g., WorksheetRenderer)
 */
export const INPUT_MACRO_TYPES = [
  "gap",
  "mcq",
  "codeTask",
  "textTask",
  "mathTask",
] as const;

/**
 * Display Macros: Stateless rendering (may still be interactive)
 * These macros display content and may have interactivity (e.g., codeRunner
 * lets you execute code) but do not persist user state
 */
export const DISPLAY_MACRO_TYPES = [
  "note",
  "highlight",
  "codeRunner",
  "table",
  "image",
] as const;

/**
 * All macro types
 */
export const ALL_MACRO_TYPES = [
  ...INPUT_MACRO_TYPES,
  ...DISPLAY_MACRO_TYPES,
] as const;

// Derived types
export type InputMacroType = (typeof INPUT_MACRO_TYPES)[number];
export type DisplayMacroType = (typeof DISPLAY_MACRO_TYPES)[number];
export type MacroType = (typeof ALL_MACRO_TYPES)[number];

// Type-safe extraction of input/display macro unions
export type InputMacro = Extract<Macro, { type: InputMacroType }>;
export type DisplayMacro = Extract<Macro, { type: DisplayMacroType }>;

/**
 * Type guard: Check if a macro is an input macro (can persist state)
 */
export function isInputMacro(macro: Macro): macro is InputMacro {
  return (INPUT_MACRO_TYPES as readonly string[]).includes(macro.type);
}

/**
 * Type guard: Check if a macro is a display macro (stateless)
 */
export function isDisplayMacro(macro: Macro): macro is DisplayMacro {
  return (DISPLAY_MACRO_TYPES as readonly string[]).includes(macro.type);
}
