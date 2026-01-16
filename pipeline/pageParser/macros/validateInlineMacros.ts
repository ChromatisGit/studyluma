import { RawMacro } from "./parseMacro";

export type MacroRequirement = "required" | "optional";
export type InlineMacroSchema = Record<string, MacroRequirement>;

export function checkInlineMacros<const Schema extends InlineMacroSchema>(
  node: RawMacro,
  schema: Schema
): void {
  const seen = new Set(Object.keys(node.inlineMacros ?? {}));

  // 1) invalid/unknown macros
  const invalid: string[] = [];
  for (const macro of seen) {
    if (!(macro in schema)) invalid.push(macro);
  }
  if (invalid.length > 0) {
    throw new Error(
      `Invalid inline macro(s) for ${node.type}: ${invalid
        .map((m) => `"${m}"`)
        .join(", ")}`
    );
  }

  // 2) missing required macros
  const missing: string[] = [];
  for (const [name, requirement] of Object.entries(schema)) {
    if (requirement === "required" && !seen.has(name)) {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required inline macro(s) in ${node.type}: ${missing
        .map((m) => `"${m}"`)
        .join(", ")}`
    );
  }
}
