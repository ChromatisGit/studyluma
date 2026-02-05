/**
 * Macro Parser Registry (Pipeline-only)
 *
 * This file is server-side only and imports parsers that may use Node modules.
 * For client-side rendering, use @macros/registry.
 */
import type { RawMacro } from "./parseMacro";

// Import all parsers
import { parser as noteParser } from "@macros/note/parser";
import { parser as highlightParser } from "@macros/highlight/parser";
import { parser as imageParser } from "@macros/image/parser";
import { parser as tableParser } from "@macros/table/parser";
import { parser as codeRunnerParser } from "@macros/codeRunner/parser";
import { parser as gapParser } from "@macros/gap/parser";
import { parser as mcqParser } from "@macros/mcq/parser";
import { parser as codeTaskParser } from "@macros/codeTask/parser";
import { parser as textTaskParser } from "@macros/textTask/parser";
import { parser as mathTaskParser } from "@macros/mathTask/parser";

// Import Macro type from registry (types only, no runtime deps)
import type { Macro } from "@macros/registry";
import type { Params } from "./parseParams";

type ParserDef = {
  parser: (node: RawMacro) => Macro;
  params?: Params;
};

// Parser map - explicitly typed to allow different parser types
const parserMap: Map<string, ParserDef> = new Map([
  ["note", noteParser],
  ["highlight", highlightParser],
  ["image", imageParser],
  ["table", tableParser],
  ["codeRunner", codeRunnerParser],
  ["gap", gapParser],
  ["mcq", mcqParser],
  ["codeTask", codeTaskParser],
  ["textTask", textTaskParser],
  ["mathTask", mathTaskParser],
] as [string, ParserDef][]);

export function parseMacroType(node: RawMacro): Macro {
  const parserDef = parserMap.get(node.type);
  if (!parserDef) throw new Error(`Unknown macro: ${node.type}`);

  // Merge default params with actual params
  const mergedParams = { ...parserDef.params, ...node.params };
  const nodeWithDefaults = { ...node, params: mergedParams };

  return parserDef.parser(nodeWithDefaults);
}

export function isMacroType(type: string): boolean {
  return parserMap.has(type);
}
