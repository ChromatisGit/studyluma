import { parse, TomlError } from "smol-toml";
import { z } from "zod";

/** One problem in a TOML document, ready to become a diagnostic. */
export type TomlIssue = {
  code: string;
  message: string;
  /** Only syntax errors know where they are (1-based, relative to the text). */
  line?: number;
  column?: number;
};

export type TomlResult<T> =
  { ok: true; value: T } | { ok: false; issues: readonly TomlIssue[] };

export type TomlOptions = {
  /** Code of issues the schema reports without a code of its own. */
  code: string;
  /** Code of keys the schema does not know (`.strict()` objects). */
  unknownKeyCode?: string;
};

const TYPE_NAMES: Record<string, string> = {
  string: "text",
  number: "a number",
  boolean: "true or false",
  array: "a list",
  object: "a table",
};

/** Wording for authors: no Zod jargon, no "Expected string, received number". */
const errorMap = (issue: z.core.$ZodRawIssue): string | undefined => {
  if (issue.code === "invalid_type") {
    return issue.input === undefined
      ? "is required"
      : `must be ${TYPE_NAMES[issue.expected] ?? issue.expected}`;
  }
  if (
    issue.code === "too_small" &&
    issue.minimum === 1 &&
    (issue.origin === "string" || issue.origin === "array")
  ) {
    return "must not be empty";
  }
  return undefined;
};

/** `graph[2].term`: list entries are counted from 1, like the blocks an author sees. */
function pathText(path: readonly PropertyKey[]): string {
  return path.reduce<string>(
    (text, part) =>
      typeof part === "number"
        ? `${text}[${part + 1}]`
        : text
          ? `${text}.${String(part)}`
          : String(part),
    "",
  );
}

/**
 * Parses TOML text and validates it against a schema. The schema defines the
 * fields, their defaults and which keys exist at all. Never throws.
 */
export function parseToml<S extends z.ZodTypeAny>(
  source: string,
  schema: S,
  options: TomlOptions,
): TomlResult<z.output<S>> {
  let document: unknown;
  try {
    document = parse(source);
  } catch (error) {
    const syntax = error instanceof TomlError ? error : undefined;
    return {
      ok: false,
      issues: [
        {
          code: "TOML_SYNTAX",
          message: (error instanceof Error
            ? error.message
            : String(error)
          ).split("\n")[0]!,
          ...(syntax ? { line: syntax.line, column: syntax.column } : {}),
        },
      ],
    };
  }
  const result = schema.safeParse(document, { error: errorMap });
  if (result.success) {
    return { ok: true, value: result.data };
  }
  const issues: TomlIssue[] = [];
  for (const issue of result.error.issues) {
    const where = pathText(issue.path);
    const prefixed = (message: string) =>
      where ? `${where}: ${message}` : message;
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        issues.push({
          code: options.unknownKeyCode ?? options.code,
          message: prefixed(`unknown key "${key}"`),
        });
      }
    } else {
      const custom = issue.code === "custom" ? issue.params?.code : undefined;
      issues.push({
        code: typeof custom === "string" ? custom : options.code,
        message: prefixed(issue.message),
      });
    }
  }
  return { ok: false, issues };
}

/** An issue with its own diagnostic code, for `refine`/`superRefine`/`transform`. */
export function codedIssue(
  code: string,
  message: string,
  path: (string | number)[] = [],
): {
  code: "custom";
  message: string;
  path: (string | number)[];
  params: { code: string };
} {
  return { code: "custom", message, path, params: { code } };
}
