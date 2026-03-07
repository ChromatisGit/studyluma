/**
 * Macro Parser Registry (Pipeline-only)
 *
 * This file is server-side only and imports parsers that may use Node modules.
 * For client-side rendering, use @macros/registry.
 */
import type { RawMacro } from "./parseMacro";

// Import all parsers
import { parser as layoutParser } from "@macros/layout/parser";
import { parser as noteParser } from "@macros/note/parser";
import { parser as cardParser } from "@macros/card/parser";
import { parser as pairsParser } from "@macros/pairs/parser";
import { parser as imageParser } from "@macros/image/parser";
import { parser as tableParser } from "@macros/table/parser";
import { parser as codeRunnerParser } from "@macros/codeRunner/parser";
import { parser as gapParser } from "@macros/gap/parser";
import { parser as mcqParser } from "@macros/mcq/parser";
import { parser as quizParser } from "@macros/quiz/parser";
import { parser as codeTaskParser } from "@macros/codeTask/parser";
import { parser as textTaskParser } from "@macros/textTask/parser";
import { parser as pnParser } from "@macros/pn/parser";

// Import Macro type from registry (types only, no runtime deps)
import type { Macro } from "@macros/registry";
import type { MacroGroup } from "@schema/page";
import type { Params } from "./parseParams";
import type { ContentType } from "./parserUtils";

type ParserDef = {
  parser: (node: RawMacro) => Macro | MacroGroup;
  params?: Params;
  allowedIn?: ContentType[];
};

// Parser map - explicitly typed to allow different parser types
const parserMap: Map<string, ParserDef> = new Map([
  ["layout", layoutParser],
  ["note", noteParser],
  ["card", cardParser],
  ["pairs", pairsParser],
  ["image", imageParser],
  ["table", tableParser],
  ["codeRunner", codeRunnerParser],
  ["gap", gapParser],
  ["mcq", mcqParser],
  ["quiz", quizParser],
  ["codeTask", codeTaskParser],
  ["textTask", textTaskParser],
  ["pn", pnParser],
] as [string, ParserDef][]);

export function parseMacroType(node: RawMacro, contentType?: ContentType): Macro | MacroGroup {
  const parserDef = parserMap.get(node.type);
  if (!parserDef) throw new Error(`Unknown macro: ${node.type}`);

  if (contentType && parserDef.allowedIn && !parserDef.allowedIn.includes(contentType)) {
    throw new Error(`#${node.type} cannot be used in ${contentType} content`);
  }

  // Merge default params with actual params
  const mergedParams = { ...parserDef.params, ...node.params };
  const nodeWithDefaults = { ...node, params: mergedParams };

  return parserDef.parser(nodeWithDefaults);
}

export function isMacroType(type: string): boolean {
  return parserMap.has(type);
}
