import { RawMacro } from "./parseMacro";
import { Params } from "./parseParams";
import { InlineMacroSchema } from "./validateInlineMacros";

export type MacroDefinition<TType extends string, TReturn> = {
  type: TType;
  parser: (node: RawMacro) => TReturn;
  inline?: InlineMacroSchema;
  params?: Params;
};

export const defineMacro = <TType extends string, TReturn>(
  definition: MacroDefinition<TType, TReturn>
): MacroDefinition<TType, TReturn> => definition;

export const defineMacroMap = <
  Map extends Record<string, MacroDefinition<string, unknown>>
>(
  map: { [K in keyof Map]: Map[K] & { type: K } }
): Map => map;
