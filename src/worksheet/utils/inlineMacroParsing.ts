import { DecoratorArgs } from "@worksheet/taskRegistry";

export type ParsedMacro = {
  name: string;
  params?: string;
  body: string;
  start: number;
  end: number;
};

const MACRO_NAME_REGEX = /^[A-Za-z][A-Za-z0-9_]*/;
const ARG_KEY_VALUE_REGEX = /[:=]/;
const WHITESPACE_REGEX = /\s/;
const INLINE_MACRO_NAMES = new Set(["hint", "solution", "starter", "validation"]);

type BalancedReadResult = {
  content: string;
  nextIndex: number;
};

/**
 * Extracts inline macros such as #hint[...], #solution[...], etc.
 * Returns the body with those macros removed and a map of macroName -> macroBody.
 */
export function extractInlineMacros(body: string): {
  cleanedBody: string;
  inlineMacros: Record<string, string>;
} {
  const inlineMacros: Record<string, string> = {};
  let cleanedBody = "";
  let cursor = 0;

  while (true) {
    const macro = findNextMacro(body, cursor);
    if (!macro) break;

    // Text between previous cursor and macro start
    const textBeforeMacro = body.slice(cursor, macro.start);

    if (INLINE_MACRO_NAMES.has(macro.name)) {
      // Remove inline macro from output
      cleanedBody += textBeforeMacro;

      if (inlineMacros[macro.name]) {
        throw new Error(`Duplicate inline macro #${macro.name}.`);
      }

      inlineMacros[macro.name] = macro.body.trim();
      cursor = macro.end;
    } else {
      // Non-inline macros remain in the body
      cleanedBody += body.slice(cursor, macro.end);
      cursor = macro.end;
    }
  }

  // Remaining tail
  cleanedBody += body.slice(cursor);

  return {
    cleanedBody: cleanedBody.trim(),
    inlineMacros,
  };
}

/**
 * Parses decorator-style arguments.
 *
 * Examples:
 *   `"My title"`              -> { title: "My title" }
 *   "key=value"               -> { key: "value" }
 *   "flag"                    -> { flag: true }
 *   "n=42, active=true"       -> { n: 42, active: true }
 */
export function parseArgs(raw?: string): DecoratorArgs {
  if (!raw) return {};

  const trimmed = raw.trim();
  const args: DecoratorArgs = {};
  if (!trimmed) return args;

  // Single quoted/quoted string as title
  if (isWrappedInQuotes(trimmed)) {
    args.title = trimmed.slice(1, -1);
    return args;
  }

  // Comma-separated key/value pairs or flags
  for (const part of trimmed.split(",")) {
    const segment = part.trim();
    if (!segment) continue;

    const [rawKey, rawValue] = segment
      .split(ARG_KEY_VALUE_REGEX, 2)
      .map((entry) => entry.trim());

    const key = rawKey;
    if (!key) continue;

    args[key] = parseArgValue(rawValue);
  }

  return args;
}

function isWrappedInQuotes(value: string): boolean {
  if (value.length < 2) return false;
  const first = value[0];
  const last = value[value.length - 1];
  return (
    (first === '"' && last === '"') ||
    (first === "'" && last === "'")
  );
}

function parseArgValue(rawValue?: string): string | number | boolean {
  // Flag without explicit value: "flag" => true
  if (rawValue === undefined || rawValue === "") return true;

  // Quoted string
  if (isWrappedInQuotes(rawValue)) {
    return rawValue.slice(1, -1);
  }

  // Booleans
  if (rawValue === "true") return true;
  if (rawValue === "false") return false;

  // Numbers
  const numeric = Number(rawValue);
  if (!Number.isNaN(numeric)) return numeric;

  // Fallback to raw string
  return rawValue;
}

/**
 * Finds the next macro occurrence starting from `startIndex`.
 * A macro looks like: #name(optionalArgs)[body]
 */
export function findNextMacro(
  source: string,
  startIndex: number
): ParsedMacro | undefined {
  let index = source.indexOf("#", startIndex);

  while (index !== -1) {
    const macro = parseMacroAt(source, index);
    if (macro) return macro;
    index = source.indexOf("#", index + 1);
  }

  return undefined;
}

function parseMacroAt(source: string, hashIndex: number): ParsedMacro | undefined {
  if (source[hashIndex] !== "#") return undefined;

  const afterHash = source.slice(hashIndex + 1);
  const nameMatch = MACRO_NAME_REGEX.exec(afterHash);
  if (!nameMatch) return undefined;

  const name = nameMatch[0];

  let cursor = hashIndex + 1 + name.length;

  // Skip whitespace after macro name
  cursor = skipWhitespace(source, cursor);

  // Optional parameters: #(params)
  let params: string | undefined;
  if (source[cursor] === "(") {
    const paramResult = readBalanced(source, cursor, "(", ")");
    if (!paramResult) return undefined;

    params = paramResult.content;
    cursor = skipWhitespace(source, paramResult.nextIndex);
  }

  // Required body: [body]
  if (source[cursor] !== "[") return undefined;

  const bodyResult = readBalanced(source, cursor, "[", "]");
  if (!bodyResult) return undefined;

  return {
    name,
    params,
    body: bodyResult.content,
    start: hashIndex,
    end: bodyResult.nextIndex,
  };
}

function skipWhitespace(source: string, index: number): number {
  while (index < source.length && WHITESPACE_REGEX.test(source[index])) {
    index++;
  }
  return index;
}

/**
 * Reads a balanced section starting at `openIndex`, handling nested pairs
 * and ignoring delimiters inside single/double-quoted strings.
 *
 * Example: readBalanced("foo(bar[baz])", 3, "(", ")")
 */
function readBalanced(
  source: string,
  openIndex: number,
  openChar: string,
  closeChar: string
): BalancedReadResult | undefined {
  if (source[openIndex] !== openChar) return undefined;

  let depth = 0;
  let inString: '"' | "'" | null = null;

  for (let i = openIndex; i < source.length; i++) {
    const char = source[i];
    const prev = source[i - 1];

    // Inside a quoted string: only look for closing quote, ignore delimiters.
    if (inString) {
      if (char === inString && prev !== "\\") {
        inString = null;
      }
      continue;
    }

    // Enter string
    if (char === '"' || char === "'") {
      inString = char as '"' | "'";
      continue;
    }

    // Track nesting
    if (char === openChar) {
      depth++;
    } else if (char === closeChar) {
      depth--;

      if (depth === 0) {
        return {
          content: source.slice(openIndex + 1, i),
          nextIndex: i + 1,
        };
      }

      if (depth < 0) {
        return undefined;
      }
    }
  }

  // Unbalanced / unterminated
  return undefined;
}