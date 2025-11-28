import { DecoratorArgs } from "../taskRegistry";

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

    const between = body.slice(cursor, macro.start);

    if (INLINE_MACRO_NAMES.has(macro.name)) {
      cleanedBody += between;
      if (inlineMacros[macro.name]) {
        throw new Error(`Duplicate inline macro #${macro.name}.`);
      }
      inlineMacros[macro.name] = macro.body.trim();
      cursor = macro.end;
      continue;
    }

    cleanedBody += body.slice(cursor, macro.end);
    cursor = macro.end;
  }

  cleanedBody += body.slice(cursor);

  return { cleanedBody: cleanedBody.trim(), inlineMacros };
}

export function parseArgs(raw?: string): DecoratorArgs {
  if (!raw) return {};

  const trimmed = raw.trim();
  const args: DecoratorArgs = {};
  if (!trimmed) return args;

  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  if (quoted) {
    args.title = trimmed.slice(1, -1);
    return args;
  }

  for (const part of trimmed.split(",")) {
    const segment = part.trim();
    if (!segment) continue;

    const [rawKey, rawValue] = segment
      .split(ARG_KEY_VALUE_REGEX, 2)
      .map((entry) => entry.trim());
    const key = rawKey;
    if (!key) continue;

    let value: string | number | boolean;
    if (rawValue === undefined || rawValue === "") {
      value = true;
    } else if (
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) {
      value = rawValue.slice(1, -1);
    } else if (rawValue === "true" || rawValue === "false") {
      value = rawValue === "true";
    } else if (!Number.isNaN(Number(rawValue))) {
      value = Number(rawValue);
    } else {
      value = rawValue;
    }

    args[key] = value;
  }

  return args;
}

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

function parseMacroAt(source: string, index: number): ParsedMacro | undefined {
  if (source[index] !== "#") return undefined;

  const nameMatch = MACRO_NAME_REGEX.exec(source.slice(index + 1));
  if (!nameMatch) return undefined;

  let cursor = index + 1 + nameMatch[0].length;
  while (WHITESPACE_REGEX.test(source[cursor])) cursor++;

  let params: string | undefined;
  if (source[cursor] === "(") {
    const paramResult = readBalanced(source, cursor, "(", ")");
    if (!paramResult) return undefined;
    params = paramResult.content;
    cursor = paramResult.nextIndex;
    while (WHITESPACE_REGEX.test(source[cursor])) cursor++;
  }

  if (source[cursor] !== "[") return undefined;
  const bodyResult = readBalanced(source, cursor, "[", "]");
  if (!bodyResult) return undefined;

  return {
    name: nameMatch[0],
    params,
    body: bodyResult.content,
    start: index,
    end: bodyResult.nextIndex,
  };
}

function readBalanced(
  source: string,
  openIndex: number,
  openChar: string,
  closeChar: string
): { content: string; nextIndex: number } | undefined {
  let depth = 0;
  let inString: '"' | "'" | null = null;

  for (let i = openIndex; i < source.length; i++) {
    const char = source[i];
    const prev = source[i - 1];

    if (inString) {
      if (char === inString && prev !== "\\") {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char as '"' | "'";
      continue;
    }

    if (char === openChar) depth++;
    if (char === closeChar) {
      depth--;
      if (depth === 0) {
        return {
          content: source.slice(openIndex + 1, i),
          nextIndex: i + 1,
        };
      }
      if (depth < 0) return undefined;
    }
  }

  return undefined;
}
