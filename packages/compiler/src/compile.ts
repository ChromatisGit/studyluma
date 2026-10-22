import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  extname,
  join,
  posix,
  relative,
  resolve,
  sep,
} from "node:path";
import { renderToString } from "kern-typ";
import { z } from "zod";
import {
  CATALOG_FILE,
  CATALOG_FORMAT_VERSION,
  CATALOG_META_FILE,
  CHECK_POINTS,
  FUNCTION_NAMES,
  UNSUPPORTED_FUNCTIONS,
  computeCatalogBuildId,
  decimalCommas,
  germanDecimals,
  prepareTypstMath,
  serializeCatalogMeta,
  splitOperation,
  typstToRow,
  type CatalogArtifactMeta,
  type SlideTag,
} from "@studyluma/catalog-contract";
import compilerPackage from "../package.json" with { type: "json" };

const MATHML_NAMESPACE = ' xmlns="http://www.w3.org/1998/Math/MathML"';
import {
  courseSchema,
  definitionsSchema,
  emptyFrontSchema,
  foliensatzFrontSchema,
  summaryFrontSchema,
  topicSchema,
  worksheetFrontSchema,
} from "./config";
import {
  functionProblems,
  functionRow,
  letters,
  parseGraphic,
} from "./graphic";
import { finitePoints } from "./constant";
import { parseToml, type TomlOptions } from "./toml";
import type {
  Answer,
  Asset,
  Bundle,
  ChallengePool,
  Chapter,
  Course,
  DerivationStep,
  Diagnostic,
  Foliensatz,
  GraphicSpec,
  Inline,
  Location,
  Placement,
  Quiz,
  RichNode,
  SourceEntry,
  Summary,
  Task,
  TaskPart,
  Topic,
  Worksheet,
} from "./schema";

type Line = { text: string; line: number };
type Document = {
  file: string;
  chapter: Chapter;
  lines: Line[];
  /** The TOML between the `+++` lines and the file line it starts on. */
  front?: { text: string; line: number };
};
const hash = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const id = (type: string, key: string) => `${type}_${hash(key).slice(0, 16)}`;
/** URL name of a chapter folder or worksheet file: lowercase, hyphens for spaces, without its `01-` ordering prefix. */
const slugOf = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^\d+-(?=.)/, "");
const unquote = (s: string) =>
  s.trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_m, a, b) => a ?? b);
/** The text between double quotes, or undefined when `s` is not a quoted title. */
const quoted = (s: string) => /^"([\s\S]+)"$/.exec(s.trim())?.[1];
/** Merkkarte anchor: lowercase, whitespace replaced by hyphens. */
const anchorOf = (title: string) =>
  title.trim().toLowerCase().replace(/\s+/g, "-");
const imageTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/** A function name followed by a variable, a number or π: `sin x`, `ln 2`. */
const BARE_CALL = /(?<!\p{L})(sin|cos|ln)\s+(?:pi(?!\p{L})|\p{L}(?!\p{L})|\d)/u;

/** Splits a table row at `|` outside gaps `((a | b))` and outside math `$|x|$`. */
function splitCells(row: string): string[] {
  const cells: string[] = [];
  let gap = false,
    math = false,
    depth = 0,
    current = "";
  for (let i = 0; i < row.length; i++) {
    const c = row[i]!;
    if (!gap && c === "(" && row[i + 1] === "(") {
      gap = true;
      depth = 0;
      current += "((";
      i++;
      continue;
    }
    if (gap && c === "(") depth++;
    else if (gap && c === ")") {
      if (depth) depth--;
      else if (row[i + 1] === ")") {
        gap = false;
        current += "))";
        i++;
        continue;
      }
    } else if (c === "$") math = !math;
    else if (c === "|" && !gap && !math) {
      cells.push(current);
      current = "";
      continue;
    }
    current += c;
  }
  cells.push(current);
  return cells;
}

/** Names that are no letters of a product: functions, `pi` and Typst calls. */
const NAMES = [
  ...FUNCTION_NAMES,
  ...UNSUPPORTED_FUNCTIONS,
  "pi",
  "sqrt",
  "root",
  "frac",
  "abs",
  "vec",
];

/**
 * A run of three or more letters without a known name in it: `Parabel`.
 * Letters next to each other multiply, so this would silently be a product.
 */
const wordIn = (term: string) =>
  term
    .replace(/"[^"]*"/g, "")
    .match(/\p{L}{3,}/gu)
    ?.find((run) => !NAMES.some((name) => run.includes(name)));

/** A math gap: `$term$`, optionally followed by `~ rounding`. */
const MATH_GAP = /^\$([^$]+)\$(?:\s*~\s*([^$]+))?$/;

/** A text gap that reads like math: digits, operators, π, one letter or `sin x`. */
const looksLikeMath = (text: string) =>
  /\d|[=+*^/{}()<>~]/.test(text) ||
  /^\p{L}$/u.test(text) ||
  /(?<!\p{L})(?:pi|π)(?!\p{L})/u.test(text) ||
  BARE_CALL.test(text);

export class CompileFailure extends Error {
  constructor(readonly diagnostics: Diagnostic[]) {
    super(
      diagnostics
        .filter((d) => d.severity === "error")
        .map(
          (d) =>
            `${d.file}:${d.line}:${d.column} ${d.code}: ${d.message}${d.inclusionChain ? ` (${d.inclusionChain.join(" → ")})` : ""}`,
        )
        .join("\n"),
    );
  }
}
export type CompileOptions = {
  /**
   * The courses (`kurse/<id>.toml`) to publish; every other course file is
   * left out of the build, unread. Absent: all courses.
   */
  courses?: readonly string[];
};
export function compileContent(
  contentRoot: string,
  options: CompileOptions = {},
): {
  bundle: Bundle;
  diagnostics: Diagnostic[];
  files: Map<string, Uint8Array>;
} {
  const root = resolve(contentRoot);
  const realRoot = realpathSync(root);
  const diagnostics: Diagnostic[] = [];
  const files = new Map<string, Uint8Array>();
  const assets = new Map<string, Asset>();
  const gapCounters = new Map<string, number>();
  const chapters = new Map<string, Chapter>();
  const pendingLinks: { node: Inline; file: string; line: number }[] = [];
  /** `::merkkarte` blocks on slides; the target is resolved once all chapters are parsed. */
  const pendingCards: {
    node: { type: "merkkarteCard"; targetId: string };
    file: string;
    line: number;
    name?: string;
    url?: string;
  }[] = [];
  const nextFilenames = new Map<string, { name: string; file: string }>();
  const foliensatzByFile = new Map<string, Foliensatz>();
  let recognizedDocuments = 0;
  const summaries: Summary[] = [],
    worksheets: Worksheet[] = [],
    challengePools: ChallengePool[] = [],
    quizzes: Quiz[] = [],
    foliensaetze: Foliensatz[] = [];
  const error = (
    code: string,
    message: string,
    loc: Location,
    inclusionChain?: string[],
  ) =>
    diagnostics.push({
      severity: "error",
      code,
      message,
      ...loc,
      ...(inclusionChain ? { inclusionChain } : {}),
    });
  const obsolete = (message: string, file: string, line: number) =>
    error("OBSOLETE_SYNTAX", message, { file, line, column: 1 });
  const warn = (code: string, message: string, loc: Location) =>
    diagnostics.push({ severity: "warning", code, message, ...loc });
  const loc = (file: string, line = 1, column = 1): Location => ({
    file,
    line,
    column,
  });
  /**
   * Parses and validates a TOML file (or the text of a front matter), reporting
   * every problem as a diagnostic. `firstLine` is the file line the text starts on.
   */
  function readToml<S extends z.ZodTypeAny>(
    text: string,
    schema: S,
    file: string,
    options: TomlOptions,
    firstLine = 1,
  ): z.output<S> | undefined {
    const result = parseToml(text, schema, options);
    if (result.ok) return result.value;
    for (const issue of result.issues)
      error(
        issue.code,
        issue.message,
        loc(file, issue.line ? firstLine + issue.line - 1 : 1, issue.column),
      );
    return undefined;
  }
  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? walk(join(dir, e.name))
        : e.isFile() && e.name.endsWith(".md")
          ? [join(dir, e.name)]
          : [],
    );
  }
  function asset(path: string, file: string, line: number): string {
    const absolute = resolve(dirname(join(root, file)), path);
    if (absolute !== root && !absolute.startsWith(root + sep)) {
      error(
        "ASSET_ESCAPE",
        `Asset escapes content root: ${path}`,
        loc(file, line),
      );
      return "";
    }
    const mimeType = imageTypes[extname(absolute).toLowerCase()];
    if (!mimeType) {
      error("ASSET_TYPE", `Unsupported asset type: ${path}`, loc(file, line));
      return "";
    }
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      error("ASSET_MISSING", `Missing asset: ${path}`, loc(file, line));
      return "";
    }
    const realAsset = realpathSync(absolute);
    if (!realAsset.startsWith(realRoot + sep)) {
      error(
        "ASSET_ESCAPE",
        `Asset escapes content root: ${path}`,
        loc(file, line),
      );
      return "";
    }
    const bytes = readFileSync(absolute),
      digest = hash(bytes),
      assetId = id("asset", `${digest}:${extname(absolute).toLowerCase()}`),
      output = `assets/${digest}${extname(absolute).toLowerCase()}`;
    assets.set(assetId, {
      id: assetId,
      path: output,
      sha256: digest,
      mimeType,
      byteLength: bytes.length,
    });
    files.set(output, bytes);
    return assetId;
  }
  /** Reads a Grafik TOML relative to the Markdown file; it travels inside the catalog. */
  function readGraphic(
    path: string,
    file: string,
    line: number,
  ): GraphicSpec | undefined {
    const absolute = resolve(dirname(join(root, file)), path);
    if (absolute !== root && !absolute.startsWith(root + sep)) {
      error(
        "GRAPHIC_ESCAPE",
        `Grafik escapes content root: ${path}`,
        loc(file, line),
      );
      return undefined;
    }
    if (!/\.toml$/i.test(path)) {
      error(
        "GRAPHIC_TYPE",
        `A Grafik file must be .toml: ${path}`,
        loc(file, line),
      );
      return undefined;
    }
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      error("GRAPHIC_MISSING", `Missing Grafik: ${path}`, loc(file, line));
      return undefined;
    }
    if (!realpathSync(absolute).startsWith(realRoot + sep)) {
      error(
        "GRAPHIC_ESCAPE",
        `Grafik escapes content root: ${path}`,
        loc(file, line),
      );
      return undefined;
    }
    const spec = parseGraphic(
      readFileSync(absolute, "utf8"),
      (code, message) => error(code, `${path}: ${message}`, loc(file, line)),
      (code, message) => warn(code, `${path}: ${message}`, loc(file, line)),
    );
    return spec && withLabels(spec, file, line);
  }
  /** Typesets the formula of each named function (`f(x) = …`). */
  function withLabels(
    spec: GraphicSpec,
    file: string,
    line: number,
  ): GraphicSpec {
    return {
      ...spec,
      graphs: spec.graphs.map((g) =>
        g.label ? { ...g, label: math(g.label.source, file, line) } : g,
      ),
    };
  }
  function math(
    source: string,
    file: string,
    line: number,
    displayMode = false,
  ): { source: string; display: string } {
    if (/\bdot(?:\.op)?\b/.test(source.replace(/"[^"]*"/g, "")))
      error(
        "MATH_SYNTAX",
        `Use * for multiplication instead of dot: ${source}`,
        loc(file, line),
      );
    const stack: string[] = [];
    const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
    for (const c of source) {
      if (pairs[c]) stack.push(pairs[c]);
      else if (")] }".replace(/ /g, "").includes(c) && stack.pop() !== c)
        error(
          "MATH_SYNTAX",
          `Unbalanced Typst math: ${source}`,
          loc(file, line),
        );
    }
    if (
      stack.length ||
      !source.trim() ||
      /\\[A-Za-z]+/.test(source) ||
      /[\^_]\s*$/.test(source)
    )
      error("MATH_SYNTAX", `Malformed Typst math: ${source}`, loc(file, line));
    let display = "";
    try {
      // Pages insert the MathML into HTML, which puts <math> in its namespace
      // anyway; the attribute was a quarter of all MathML bytes.
      display = germanDecimals(
        renderToString(prepareTypstMath(source), {
          output: "mathml",
          displayMode,
        }),
      ).replace(MATHML_NAMESPACE, "");
    } catch (e) {
      error(
        "MATH_SYNTAX",
        `Invalid Typst math: ${source} (${String(e)})`,
        loc(file, line),
      );
    }
    return { source, display };
  }
  /** One formula line; `equation | operation` keeps both parts apart. */
  function derivationStep(
    source: string,
    file: string,
    line: number,
  ): DerivationStep {
    const split = splitOperation(source);
    if (!split) return { equation: math(source, file, line) };
    return {
      equation: math(split.equation, file, line),
      operation: math(split.operation, file, line),
    };
  }
  /**
   * One number or term: the exact value, a prepared row and an allowed rounding.
   * It is always math, so `pi` or `x` alone is a term, never a word.
   */
  function single(written: string, file: string, line: number): Answer {
    if (written.includes("$"))
      error(
        "ANSWER_MATH",
        `Write the answer without dollar signs: ${written.replace(/\$/g, "")}`,
        loc(file, line),
      );
    if (/\bdot(?:\.op)?\b/.test(written.replace(/"[^"]*"/g, "")))
      error(
        "ANSWER_MATH",
        `Use * for multiplication instead of dot: ${written}`,
        loc(file, line),
      );
    // Authors may write the decimal comma; answers are kept with a point.
    const value = decimalCommas(written);
    const pieces = value
      .split(/\s+~\s*|^~\s*/)
      .filter(Boolean)
      .map((s) => s.trim());
    const rounded = value.includes("~") ? pieces.at(-1) : undefined;
    const exact = value.startsWith("~") ? undefined : pieces[0];
    let checkRow: ReturnType<typeof typstToRow> | undefined;
    if (!exact && !rounded)
      error("ANSWER_EMPTY", "Answer is empty", loc(file, line));
    const word = exact ? wordIn(exact) : undefined;
    if (word)
      error(
        "ANSWER_WORD",
        `${word} is a word, but the answer is a number or term; a word belongs in a text gap ((${word})), a product of letters is written with spaces (${[...word].join(" ")})`,
        loc(file, line),
      );
    else if (exact) {
      math(exact, file, line);
      try {
        checkRow = typstToRow(exact);
        for (const problem of functionProblems(checkRow))
          error(
            "ANSWER_MATH",
            `${problem} (in the answer ${exact})`,
            loc(file, line),
          );
      } catch (e) {
        error(
          "ANSWER_MATH",
          `Cannot prepare answer ${exact}: ${String(e)}`,
          loc(file, line),
        );
      }
    }
    if (rounded) {
      math(rounded, file, line);
      if (!/^-?\d+(?:\.\d+)?$/.test(rounded))
        error(
          "ANSWER_ROUND",
          "Rounded answer must be a decimal number",
          loc(file, line),
        );
    }
    return {
      ...(exact ? { exact } : {}),
      ...(checkRow ? { checkRow } : {}),
      ...(rounded
        ? { rounded, decimals: rounded.split(".")[1]?.length ?? 0 }
        : {}),
    };
  }
  /** Splits at semicolons outside brackets: `1; (2; 3); 4` has three parts. */
  function splitElements(text: string): string[] {
    const parts: string[] = [];
    let depth = 0,
      current = "";
    for (const c of text) {
      if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) depth--;
      if (c === ";" && depth === 0) {
        parts.push(current.trim());
        current = "";
      } else current += c;
    }
    if (current.trim() || parts.length) parts.push(current.trim());
    return parts;
  }
  /** A comma outside brackets that is not a decimal comma: `1, 2` or `1,2,3`. */
  function hasSeparatorComma(text: string): boolean {
    let depth = 0;
    for (const c of decimalCommas(text)) {
      if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) depth--;
      else if (c === "," && depth === 0) return true;
    }
    return false;
  }
  /** `x = 3` splits into the label `x` and the value `3`; without `=` there is no label. */
  function splitLabel(raw: string): { label?: string; value: string } {
    const value = raw.trim();
    const eq = value.indexOf("=");
    return eq < 0
      ? { value }
      : { label: value.slice(0, eq).trim(), value: value.slice(eq + 1).trim() };
  }
  /**
   * A task's expected answer: a number or term, a solution set `{1; 5}`
   * (`{}` for no solution) or a vector `vec(1; 2)`. `f(x) = …` labels the
   * field. Elements are separated by `;`, so `,` is always a decimal comma.
   */
  function answer(raw: string, file: string, line: number): Answer {
    const { label, value } = splitLabel(raw);
    const group = /^\{([\s\S]*)\}$/.exec(value) ?? undefined;
    const vector = /^vec\(([\s\S]*)\)$/.exec(value) ?? undefined;
    const inner = group ?? vector;
    if (!inner)
      return { ...single(value, file, line), ...(label ? { label } : {}) };
    const parts = splitElements(inner[1]!);
    const wrong = parts.some(hasSeparatorComma);
    if (wrong)
      error(
        "ANSWER_SEPARATOR",
        `Separate the elements of a set or vector with ";", not ",": ${value} should be written ${value.replace(/,\s*/g, "; ")}`,
        loc(file, line),
      );
    const elements = wrong ? [] : parts.map((part) => single(part, file, line));
    if (vector && !wrong && elements.length < 2)
      error(
        "ANSWER_VECTOR",
        "A vector needs at least two components",
        loc(file, line),
      );
    return {
      exact: value,
      kind: group ? "set" : "vector",
      elements,
      ...(label ? { label } : {}),
    };
  }
  /** One expected function of a Graph: `y = 2x + 3` or just `2x + 3`, in x only. */
  function graphAnswer(raw: string, file: string, line: number): Answer {
    const parsed = functionRow(decimalCommas(raw));
    if ("problem" in parsed) {
      error("ANSWER_MATH", parsed.problem, loc(file, line));
      return {};
    }
    math(parsed.expression, file, line);
    for (const problem of functionProblems(parsed.row))
      error(
        "ANSWER_MATH",
        `${problem} (in the Graph answer ${parsed.expression})`,
        loc(file, line),
      );
    for (const name of letters(parsed.row))
      if (name.length === 1)
        error(
          "ANSWER_VARIABLE",
          `A Graph answer may only use x, found "${name}"`,
          loc(file, line),
        );
    return { exact: parsed.expression, checkRow: parsed.row };
  }
  /** `(($3$))` is a number or term, `((Wort))` is text; nothing is guessed. */
  function gapAnswer(raw: string, file: string, line: number): Answer {
    const text = raw.trim();
    const m = MATH_GAP.exec(text);
    if (!m) {
      if (text.includes("$"))
        error(
          "GAP_MATH",
          `Write a math gap as (($term$)), optionally followed by ~ and the rounding: ((${text}))`,
          loc(file, line),
        );
      else if (!text) error("ANSWER_EMPTY", "Answer is empty", loc(file, line));
      else if (looksLikeMath(text))
        error(
          "GAP_TEXT_MATH",
          `((${text})) is compared as text but looks like math; write (($${text}$)) for a number or term`,
          loc(file, line),
        );
      return text ? { exact: text } : {};
    }
    const body = m[2] ? `${m[1]!.trim()} ~ ${m[2].trim()}` : m[1]!.trim();
    const own = answer(body, file, line);
    if (own.kind)
      error(
        "GAP_ANSWER_KIND",
        "Solution sets and vectors are only supported as the ::antwort of an Antwort task",
        loc(file, line),
      );
    return own;
  }
  function inline(
    source: string,
    file: string,
    line: number,
    gaps = false,
  ): Inline[] {
    const out: Inline[] = [];
    let rest = source;
    const pattern =
      /(!!?\[[^\]]*\]\([^)]*\)|\[[^\]]+\]\([^)]*\)|\(\((?:[^()]|\([^()]*\))*\)\)|\$[^$]+\$|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|==[^=]+==|_[^_]+_|`[^`]+`)/;
    while (rest) {
      const match = pattern.exec(rest);
      if (!match) {
        out.push({ type: "text", value: rest });
        break;
      }
      if (match.index)
        out.push({ type: "text", value: rest.slice(0, match.index) });
      const token = match[0];
      rest = rest.slice(match.index + token.length);
      if (token.startsWith("((")) {
        if (!gaps)
          error(
            "GAP_CONTEXT",
            "Gap outside an Einsetzen task or step",
            loc(file, line),
          );
        const inner = token.slice(2, -2).trim();
        // `(($|x|$))` is one term, not a choice between `$` and `x`.
        const parts = MATH_GAP.test(inner)
          ? [inner]
          : inner.split("|").map((s) => s.trim());
        const gapKey = `${file}:${line}`;
        const gapNumber = (gapCounters.get(gapKey) ?? 0) + 1;
        gapCounters.set(gapKey, gapNumber);
        out.push({
          type: "gap",
          id: id("gap", `${gapKey}:${gapNumber}`),
          // A choice is compared as written; only a free gap has an answer.
          ...(parts.length > 1
            ? { choices: parts }
            : { choices: [], answer: gapAnswer(parts[0] ?? "", file, line) }),
        });
      } else if (token.startsWith("!![") || token.startsWith("![")) {
        const m = /^!?!\[([^\]]*)\]\(([^)]*)\)$/.exec(token)!;
        out.push({
          type: "image",
          alt: m[1]!,
          assetId: asset(m[2]!, file, line),
          fit: token.startsWith("!![") ? "cover" : "contain",
        });
      } else if (token.startsWith("[")) {
        const m = /^\[([^\]]+)\]\(([^)]*)\)$/.exec(token)!;
        const node: Inline = {
          type: "link",
          url: m[2]!,
          children: [{ type: "text", value: m[1]! }],
        };
        noteLink(node, file, line);
        out.push(node);
      } else if (token.startsWith("$"))
        out.push({ type: "math", ...math(token.slice(1, -1), file, line) });
      else if (token.startsWith("**"))
        out.push({
          type: "strong",
          children: inline(token.slice(2, -2), file, line, gaps),
        });
      else if (token.startsWith("=="))
        out.push({
          type: "highlight",
          children: inline(token.slice(2, -2), file, line, gaps),
        });
      else if (token.startsWith("_") || token.startsWith("*"))
        out.push({
          type: "emphasis",
          children: inline(token.slice(1, -1), file, line, gaps),
        });
      else out.push({ type: "code", value: token.slice(1, -1) });
    }
    if ((source.match(/\$/g)?.length ?? 0) % 2)
      error("MATH_SYNTAX", "Unclosed math delimiter", loc(file, line));
    return out;
  }
  /** Links to a chapter's inhalt.md are Merkkarte references; they are resolved once all chapters are parsed. */
  function noteLink(node: Inline, file: string, line: number) {
    if (node.type !== "link") return;
    const url = node.url;
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase();
    if (scheme && !["http", "https", "mailto", "tel"].includes(scheme)) {
      error(
        "LINK_SCHEME",
        `Links may use http, https, mailto or tel, not ${scheme}:`,
        loc(file, line),
      );
      return;
    }
    if (scheme || url.startsWith("#")) return;
    if (/^[^/:#.]+\/[^/:#.]+$/.test(url)) {
      obsolete(
        `Chapter-style reference (${url}) was replaced by a relative link such as ../kapitel/inhalt.md#merkkarte`,
        file,
        line,
      );
      return;
    }
    if (posix.basename(url.split("#")[0]!) === "inhalt.md")
      pendingLinks.push({ node, file, line });
  }
  function rich(
    lines: Line[],
    file: string,
    gaps = false,
    slide = false,
  ): RichNode[] {
    const out: RichNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i]!;
      const s = line.text.trim();
      if (!s) {
        i++;
        continue;
      }
      if (/^::schreib(?:flaeche|en)\b/.test(s)) {
        obsolete(
          "::schreiben and ::schreibflaeche were replaced by ::platz (free space; ::platz 2 for more)",
          file,
          line.line,
        );
        i++;
        continue;
      }
      if (/^::platz(?:\s+\d+)?$/.test(s)) {
        if (!slide)
          error(
            "MARKER_CONTEXT",
            "::platz is only allowed on slides",
            loc(file, line.line),
          );
        const size = Number(s.slice(7).trim() || 1);
        if (size < 1 || size > 9)
          error(
            "SPACE_VALUE",
            "::platz takes a number from 1 to 9",
            loc(file, line.line),
          );
        out.push({ type: "space", size: Math.min(9, Math.max(1, size)) });
        i++;
        continue;
      }
      if (/^::merkkarte\b/.test(s)) {
        if (!slide)
          error(
            "MARKER_CONTEXT",
            "::merkkarte is only allowed on slides",
            loc(file, line.line),
          );
        const value = s.slice(11).trim(),
          link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(value),
          name = quoted(value)?.trim();
        if (!link && !name)
          error(
            "MERKKARTE_SYNTAX",
            'Expected ::merkkarte "Name" or ::merkkarte [Name](../kapitel/inhalt.md#name)',
            loc(file, line.line),
          );
        else {
          const node = { type: "merkkarteCard" as const, targetId: "" };
          pendingCards.push({
            node,
            file,
            line: line.line,
            ...(link ? { url: link[2]! } : { name: name! }),
          });
          out.push(node);
        }
        i++;
        continue;
      }
      if (/^::grafik\b/.test(s)) {
        const m = /^::grafik\s+\[([^\]]*)\]\(([^)]+)\)$/.exec(s);
        if (!m) {
          error(
            "GRAPHIC_SYNTAX",
            "Expected ::grafik [Beschriftung](pfad/zur/grafik.toml), the brackets may stay empty",
            loc(file, line.line),
          );
        } else {
          const graphic = readGraphic(m[2]!, file, line.line);
          if (graphic)
            out.push({ type: "graphic", title: m[1]!.trim(), graphic });
        }
        i++;
        continue;
      }
      if (/^::/.test(s)) {
        error("MARKER_CONTEXT", `Invalid marker ${s}`, loc(file, line.line));
        i++;
        continue;
      }
      if (s === "---") {
        i++;
        continue;
      }
      if (/^```/.test(s)) {
        const lang = s.slice(3).trim();
        const body: string[] = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i]!.text.trim()))
          body.push(lines[i++]!.text);
        if (i === lines.length)
          error("CODE_UNCLOSED", "Unclosed code block", loc(file, line.line));
        else i++;
        out.push({
          type: "code",
          value: body.join("\n"),
          ...(lang ? { language: lang } : {}),
        });
        continue;
      }
      if (/^\$\$/.test(s)) {
        let value = s.slice(2);
        if (value.endsWith("$$")) value = value.slice(0, -2);
        else {
          i++;
          while (i < lines.length && !lines[i]!.text.includes("$$"))
            value += "\n" + lines[i++]!.text;
          if (i < lines.length) value += "\n" + lines[i]!.text.split("$$")[0];
          else
            error("MATH_SYNTAX", "Unclosed display math", loc(file, line.line));
        }
        out.push({
          type: "math",
          ...math(value.trim(), file, line.line, true),
        });
        i++;
        continue;
      }
      if (/^#{1,6} /.test(s)) {
        const m = /^(#+) (.*)$/.exec(s)!;
        const title = quoted(m[2]!);
        if (title === undefined)
          error(
            "HEADING_QUOTES",
            `Heading titles must be in double quotes: ${m[1]} "${m[2]!.trim()}"`,
            loc(file, line.line),
          );
        out.push({
          type: "heading",
          depth: m[1]!.length,
          children: inline(title ?? m[2]!, file, line.line, gaps),
        });
        i++;
        continue;
      }
      if (
        s.startsWith("|") &&
        i + 1 < lines.length &&
        /^\|?[\s:|-]+\|?$/.test(lines[i + 1]!.text.trim())
      ) {
        const rows: Inline[][][] = [];
        const split = (v: string) =>
          splitCells(v.trim().replace(/^\||\|$/g, "")).map((c) =>
            inline(c.trim(), file, line.line, gaps),
          );
        rows.push(split(s));
        i += 2;
        while (i < lines.length && lines[i]!.text.trim().startsWith("|"))
          rows.push(split(lines[i++]!.text));
        out.push({ type: "table", rows });
        continue;
      }
      if (/^(?:- |\d+\. )/.test(s)) {
        const ordered = /^\d+\. /.test(s),
          items: RichNode[][] = [];
        while (
          i < lines.length &&
          /^(?:- |\d+\. )/.test(lines[i]!.text.trim())
        ) {
          const x = lines[i++]!;
          items.push([
            {
              type: "paragraph",
              children: inline(
                x.text.trim().replace(/^(?:- |\d+\. )/, ""),
                file,
                x.line,
                gaps,
              ),
            },
          ]);
        }
        out.push({ type: "list", ordered, items });
        continue;
      }
      const paragraph: Line[] = [];
      while (
        i < lines.length &&
        lines[i]!.text.trim() &&
        !/^(?:#{1,6} |```|\$\$|\|\s|::|---$|- |\d+\. )/.test(
          lines[i]!.text.trim(),
        )
      )
        paragraph.push(lines[i++]!);
      if (!paragraph.length) {
        i++;
        continue;
      }
      // Formula lines directly below each other: with an `| operation` in
      // one of them they are a derivation whose operations align.
      const formulas = paragraph.map(
        (x) => /^\$([^$]+)\$$/.exec(x.text.trim())?.[1],
      );
      if (
        formulas.every((x) => x !== undefined) &&
        formulas.some((x) => splitOperation(x))
      ) {
        out.push({
          type: "derivation",
          steps: formulas.map((x, n) =>
            derivationStep(x, file, paragraph[n]!.line),
          ),
        });
        continue;
      }
      out.push({
        type: "paragraph",
        children: inline(
          paragraph.map((x) => x.text.trim()).join(" "),
          file,
          line.line,
          gaps,
        ),
      });
    }
    return out;
  }
  function document(absolute: string): Document | null {
    const file = relative(root, absolute).split(sep).join("/");
    const parts = file.split("/");
    if (parts.length < 4) return null;
    const [group, topic, name] = parts as [string, string, string];
    const key = `${group}/${topic}/${name}`;
    let chapter = chapters.get(key);
    if (!chapter) {
      chapter = {
        id: id("chapter", key),
        slug: slugOf(name),
        group,
        topic,
        name,
        title: name,
        worksheetIds: [],
        quizIds: [],
        foliensatzIds: [],
      };
      chapters.set(key, chapter);
    }
    const raw = readFileSync(absolute, "utf8")
      .replace(/\r\n/g, "\n")
      .split("\n");
    let start = 0,
      front: Document["front"];
    if (raw[0]?.trim() === "---")
      obsolete(
        'Front matter now sits between +++ lines and is written as TOML (titel = "Titel")',
        file,
        1,
      );
    if (raw[0]?.trim() === "+++") {
      const end = raw.findIndex((x, i) => i > 0 && x.trim() === "+++");
      if (end < 0) error("FRONT_MATTER", "Unclosed front matter", loc(file));
      else {
        front = { text: raw.slice(1, end).join("\n"), line: 2 };
        start = end + 1;
      }
    }
    return {
      file,
      chapter,
      ...(front ? { front } : {}),
      lines: raw.slice(start).map((text, i) => ({ text, line: start + i + 1 })),
    };
  }
  /** The validated front matter of a document, or undefined when it has errors. */
  function readFront<S extends z.ZodTypeAny>(
    doc: Document,
    schema: S,
  ): z.output<S> | undefined {
    return readToml(
      doc.front?.text ?? "",
      schema,
      doc.file,
      { code: "FRONT_MATTER", unknownKeyCode: "FRONT_FIELD" },
      doc.front?.line,
    );
  }
  function sections(
    lines: Line[],
    depth: number,
    file: string,
  ): { head: string; line: number; body: Line[] }[] {
    const out: { head: string; line: number; body: Line[] }[] = [];
    for (const line of lines) {
      const m = new RegExp(`^#{${depth}} (.*)$`).exec(line.text);
      if (m) out.push({ head: m[1]!.trim(), line: line.line, body: [] });
      else if (out.length) out.at(-1)!.body.push(line);
      else if (line.text.trim())
        error(
          "STRUCTURE",
          `Content before first level ${depth} heading`,
          loc(file, line.line),
        );
    }
    return out;
  }
  const TYPES = [
    "Einsetzen",
    "Auswahl",
    "Antwort",
    "Graph",
    "Auftrag",
  ] as const;
  const RENAMED: Record<string, TaskPart["type"]> = {
    Lückentext: "Einsetzen",
    Ergebnis: "Antwort",
  };
  type Head =
    | { kind: "task"; type: TaskPart["type"]; title?: string }
    | { kind: "group"; title?: string };
  function quotedTitle(
    raw: string,
    file: string,
    line: number,
    what: string,
  ): string | undefined {
    const t = raw.trim(),
      q = quoted(t);
    if (q === undefined || !q.trim()) {
      error(
        "TITLE_QUOTES",
        `${what} must be a non-empty title in double quotes, e.g. "Title"`,
        loc(file, line),
      );
      return t.replace(/^"|"$/g, "").trim() || undefined;
    }
    return q.trim();
  }
  function parseHead(
    head: string,
    file: string,
    line: number,
    nested: boolean,
  ): Head {
    const idx = head.indexOf(":");
    const kw = (idx < 0 ? head : head.slice(0, idx)).trim();
    const rest = idx < 0 ? undefined : head.slice(idx + 1);
    const titleOf = () =>
      rest === undefined
        ? undefined
        : quotedTitle(rest, file, line, `The title of ${kw}`);
    if (kw in RENAMED) {
      obsolete(`${kw} was renamed to ${RENAMED[kw]}`, file, line);
      const title = titleOf();
      return { kind: "task", type: RENAMED[kw]!, ...(title ? { title } : {}) };
    }
    if ((TYPES as readonly string[]).includes(kw)) {
      const title = titleOf();
      return {
        kind: "task",
        type: kw as TaskPart["type"],
        ...(title ? { title } : {}),
      };
    }
    if (kw === "Gruppe") {
      if (nested)
        error(
          "TASK_GROUP_NESTED",
          "Gruppe cannot be nested inside a Gruppe",
          loc(file, line),
        );
      const title = titleOf();
      return { kind: "group", ...(title ? { title } : {}) };
    }
    error(
      "TASK_TYPE",
      `Unknown task heading "${head}". Use Einsetzen, Auswahl, Antwort, Graph, Auftrag or Gruppe: "Title" (implicit groups were removed)`,
      loc(file, line),
    );
    return { kind: "task", type: "Auftrag" };
  }
  const PART_MARKERS = [
    "antwort",
    "fehler",
    "tipp",
    "mehrfach",
    "schritte",
    "loesung",
    "textfeld",
  ];
  function parsePart(
    type: TaskPart["type"],
    title: string | undefined,
    body: Line[],
    file: string,
    line: number,
    checkpoint: boolean,
  ): TaskPart {
    const blocks: Record<string, Line[]> = { main: [] };
    const flags = new Set<string>();
    let current = "main";
    const counts = new Map<string, number>();
    for (const x of body) {
      const marker = /^::([\p{L}-]+)(?:\s+(.*))?$/u.exec(x.text.trim());
      if (marker?.[1] === "grafik") {
        blocks[current]!.push(x);
      } else if (marker) {
        const name = marker[1]!,
          arg = marker[2]?.trim();
        counts.set(name, (counts.get(name) ?? 0) + 1);
        if (!PART_MARKERS.includes(name)) {
          error(
            "MARKER_INVALID",
            `Unknown marker ::${name}`,
            loc(file, x.line),
          );
          blocks[name] = [];
          current = name;
          continue;
        }
        if (name === "mehrfach" || name === "textfeld") {
          flags.add(name);
          if (arg)
            error(
              "MARKER_ARGUMENT",
              `::${name} takes no argument`,
              loc(file, x.line),
            );
          continue;
        }
        current = name;
        blocks[name] = [];
        if (arg) blocks[name]!.push({ text: arg, line: x.line });
      } else if (x.text.trim() === "---") {
        current = "main";
      } else blocks[current]!.push(x);
    }
    for (const [k, n] of counts)
      if (n > 1) error("MARKER_DUPLICATE", `Duplicate ::${k}`, loc(file, line));
    if (checkpoint)
      for (const k of ["tipp", "schritte"])
        if (blocks[k])
          error(
            "CHECKPOINT_MARKER",
            `::${k} is forbidden in Checkpoint`,
            loc(file, line),
          );
    if (checkpoint && type === "Auftrag")
      error(
        "CHECKPOINT_TASK",
        "Auftrag forbidden in Checkpoint",
        loc(file, line),
      );
    if ((type === "Antwort" || type === "Graph") && !blocks.antwort)
      error(
        "ANSWER_REQUIRED",
        `Missing ::antwort in ${title ?? type}`,
        loc(file, line),
      );
    if (type !== "Antwort" && type !== "Graph" && blocks.antwort)
      error(
        "ANSWER_CONTEXT",
        "::antwort only allowed in Antwort and Graph",
        loc(file, line),
      );
    if (blocks.schritte && type !== "Antwort")
      error(
        "STEPS_CONTEXT",
        "::schritte only allowed in Antwort",
        loc(file, line),
      );
    if (flags.has("mehrfach") && type !== "Auswahl")
      error("MULTIPLE_CONTEXT", "::mehrfach requires Auswahl", loc(file, line));
    if (flags.has("textfeld") && type !== "Auftrag")
      error(
        "TEXTFIELD_CONTEXT",
        "::textfeld requires Auftrag",
        loc(file, line),
      );
    if (blocks.fehler && type === "Graph")
      error(
        "FEEDBACK_CONTEXT",
        "::fehler is not supported in Graph",
        loc(file, line),
      );
    if (blocks.fehler && !blocks.antwort)
      error("FEEDBACK_CONTEXT", "::fehler requires ::antwort", loc(file, line));
    let steps: TaskPart["steps"];
    if (blocks.schritte) {
      const items: NonNullable<TaskPart["steps"]>["items"] = [];
      for (const x of blocks.schritte) {
        const t = x.text.trim();
        if (!t) continue;
        const m = /^- (.+)$/.exec(t);
        if (!m) {
          error(
            "STEPS_FORMAT",
            `Schritte are written as a "- " list, got: ${t}`,
            loc(file, x.line),
          );
          continue;
        }
        const content = inline(m[1]!, file, x.line, true);
        if (!content.some((node) => node.type === "gap"))
          error(
            "STEPS_NO_GAP",
            `A step needs a gap to fill in: ${t}`,
            loc(file, x.line),
          );
        items.push({ id: id("step", `${file}:${x.line}`), content });
      }
      if (!items.length)
        error("STEPS_EMPTY", "::schritte has no steps", loc(file, line));
      steps = { items };
    }
    const markers: TaskPart["markers"] = {};
    for (const [k, v] of Object.entries(blocks)) {
      if (k === "fehler")
        markers[k] = v
          .filter((x) => x.text.trim())
          .map((x) => {
            const p = x.text.indexOf(":");
            if (p < 0)
              error(
                "FEEDBACK_FORMAT",
                "Expected wrong answer: feedback",
                loc(file, x.line),
              );
            return {
              // Like ::antwort, a label (`x = 3`) is not part of the value.
              answer: splitLabel(x.text.slice(0, p)).value,
              feedback: x.text.slice(p + 1).trim(),
            };
          });
      else if (k === "tipp" || k === "loesung") markers[k] = rich(v, file);
    }
    if (flags.has("textfeld")) markers.textfeld = true;
    const contentLines: Line[] = [];
    const options: { content: Inline[]; correct: boolean }[] = [];
    for (const x of blocks.main) {
      const match = /^- \(([ x])\) (.*)$/.exec(x.text.trim());
      if (match) {
        options.push({
          correct: match[1] === "x",
          content: inline(match[2]!, file, x.line),
        });
      } else contentLines.push(x);
    }
    if (type === "Auswahl") {
      const correct = options.filter((x) => x.correct).length;
      if (
        options.length < 2 ||
        correct < 1 ||
        (!flags.has("mehrfach") && correct !== 1)
      )
        error(
          "SELECTION_RULE",
          `Invalid Auswahl options in ${title ?? type}`,
          loc(file, line),
        );
    } else if (options.length)
      error("SELECTION_CONTEXT", "Options require Auswahl", loc(file, line));
    const content = rich(contentLines, file, type === "Einsetzen");
    if (
      type === "Einsetzen" &&
      !JSON.stringify(content).includes('"type":"gap"')
    )
      error("GAP_REQUIRED", "Einsetzen requires a gap", loc(file, line));
    const graphInputs = content.filter(
      (n) => n.type === "graphic" && n.graphic.input,
    );
    let answers: Answer[] | undefined;
    if (type === "Graph") {
      const wanted = (graphInputs[0] as { graphic: GraphicSpec } | undefined)
        ?.graphic.input?.count;
      if (graphInputs.length !== 1)
        error(
          "GRAPH_INPUT",
          "Graph needs exactly one ::grafik with eingabe",
          loc(file, line),
        );
      answers = (blocks.antwort ?? [])
        .filter((x) => x.text.trim())
        .map((x) => graphAnswer(x.text, file, x.line));
      if (wanted !== undefined && answers.length !== wanted)
        error(
          "GRAPH_ANSWER_COUNT",
          `Graph expects ${wanted} ::antwort line${wanted === 1 ? "" : "s"} (eingabe.anzahl), got ${answers.length}`,
          loc(file, line),
        );
    } else if (graphInputs.length)
      error(
        "GRAPH_INPUT_CONTEXT",
        "A ::grafik with eingabe is only allowed in a Graph task",
        loc(file, line),
      );
    const expected =
      blocks.antwort && type !== "Graph"
        ? answer(
            blocks.antwort.map((x) => x.text).join(" "),
            file,
            blocks.antwort[0]?.line ?? line,
          )
        : undefined;
    // A term that is undefined almost everywhere cannot be compared.
    const points =
      expected?.checkRow && !expected.kind
        ? finitePoints(expected.checkRow)
        : undefined;
    if (points !== undefined && points < 2)
      warn(
        "ANSWER_DOMAIN",
        `The answer ${expected?.exact} is defined at only ${points} of the ${CHECK_POINTS.length} points between x = ${Math.min(...CHECK_POINTS)} and x = ${Math.max(...CHECK_POINTS)} where entries are compared, so entries may never count as correct. Use a term that is defined on more of that range.`,
        loc(file, blocks.antwort?.[0]?.line ?? line),
      );
    return {
      id: id("part", `${file}:${line}`),
      type,
      ...(title ? { title } : {}),
      content,
      ...(expected ? { answer: expected, label: expected.label } : {}),
      ...(answers ? { answers } : {}),
      ...(type === "Auswahl"
        ? { options, multiple: flags.has("mehrfach") }
        : {}),
      ...(steps ? { steps } : {}),
      markers,
    };
  }
  function parseTask(
    head: string,
    body: Line[],
    file: string,
    line: number,
    checkpoint = false,
    challenge = false,
  ): Task {
    const info = parseHead(head, file, line, false);
    const task: Task = {
      id: id("task", `${file}:${line}`),
      ...(info.title ? { title: info.title } : {}),
      items: [],
    };
    const raw = body.map((x) => x.text);
    const count = (name: string) =>
      raw.filter((x) => x.trim().startsWith(`::${name}`)).length;
    for (const name of ["optional", "braucht"])
      if (count(name) > 1)
        error("MARKER_DUPLICATE", `Duplicate ::${name}`, loc(file, line));
    if (count("struktur"))
      obsolete(
        "::struktur was removed; steps are written with ::schritte",
        file,
        body.find((x) => x.text.trim().startsWith("::struktur"))?.line ?? line,
      );
    if (count("optional")) {
      if (checkpoint || challenge)
        error("OPTIONAL_CONTEXT", "::optional forbidden here", loc(file, line));
      task.optional = true;
    }
    if (!challenge && count("braucht"))
      error(
        "PREREQUISITE_CONTEXT",
        "::braucht only allowed in Challenges",
        loc(file, line),
      );
    if (challenge && count("braucht")) {
      const at = body.findIndex((x) => x.text.trim() === "::braucht");
      const names: string[] = [];
      for (const x of body.slice(at + 1)) {
        if (/^::|^#{1,3} /.test(x.text.trim())) break;
        if (!x.text.trim()) continue;
        const match = /^- (.*)$/.exec(x.text.trim());
        if (!match)
          error(
            "PREREQUISITE_FORMAT",
            "Expected a Markdown list",
            loc(file, x.line),
          );
        else names.push(unquote(match[1]!));
      }
      if (!names.length || new Set(names).size !== names.length)
        error(
          "PREREQUISITE_LIST",
          "Empty or duplicate prerequisite",
          loc(file, line),
        );
      task.prerequisites = names;
    }
    const itemBody: Line[] = [];
    let skipPrerequisites = false;
    for (const x of body) {
      const value = x.text.trim();
      if (value === "::braucht") {
        skipPrerequisites = true;
        continue;
      }
      if (skipPrerequisites && /^::|^#{1,3} /.test(value))
        skipPrerequisites = false;
      if (skipPrerequisites) continue;
      if (value === "::optional" || value.startsWith("::struktur")) continue;
      itemBody.push(x);
    }
    if (info.kind === "task")
      task.items.push({
        type: "part",
        part: parsePart(
          info.type,
          info.title,
          itemBody,
          file,
          line,
          checkpoint,
        ),
      });
    else {
      let current: Line[] = [],
        part: { head: string; line: number; body: Line[] } | null = null;
      const flush = () => {
        if (part) {
          const h = parseHead(part.head, file, part.line, true);
          const t =
            h.kind === "task"
              ? h
              : { type: "Auftrag" as const, title: h.title };
          task.items.push({
            type: "part",
            part: parsePart(
              t.type,
              t.title,
              part.body,
              file,
              part.line,
              checkpoint,
            ),
          });
          part = null;
        }
        if (current.some((x) => x.text.trim()))
          task.items.push({ type: "content", content: rich(current, file) });
        current = [];
      };
      for (const x of itemBody) {
        const match = /^### (.*)$/.exec(x.text);
        if (match) {
          flush();
          part = { head: match[1]!, line: x.line, body: [] };
        } else if (x.text.trim() === "---") flush();
        else if (part) part.body.push(x);
        else current.push(x);
      }
      flush();
      if (!itemBody.some((x) => /^### /.test(x.text)))
        error(
          "TASK_PARTS",
          `Gruppe${info.title ? ` "${info.title}"` : ""} has no parts`,
          loc(file, line),
        );
    }
    return task;
  }
  function sectionHead(
    head: string,
    file: string,
    line: number,
  ): { checkpoint: boolean; title: string } {
    const q = quoted(head);
    if (q !== undefined && q.trim())
      return { checkpoint: false, title: q.trim() };
    const m = /^Checkpoint(?::\s*(.*))?$/.exec(head);
    if (m)
      return {
        checkpoint: true,
        title:
          m[1] === undefined
            ? "Checkpoint"
            : (quotedTitle(m[1], file, line, "The Checkpoint title") ??
              "Checkpoint"),
      };
    if (head === "Aufgaben") {
      obsolete('# Aufgaben was replaced by # "Title"', file, line);
      return { checkpoint: false, title: head };
    }
    error(
      "HEADING_QUOTES",
      `Section titles must be in double quotes (# "Title") or # Checkpoint: got # ${head}`,
      loc(file, line),
    );
    return { checkpoint: false, title: head };
  }
  function duplicateTitles(tasks: Task[]) {
    const names = tasks.flatMap((t) => (t.title ? [t.title] : []));
    return new Set(names).size !== names.length;
  }
  function parseWorksheet(doc: Document) {
    const front = readFront(doc, worksheetFrontSchema);
    const filename = basename(doc.file, ".md");
    const sheet: Worksheet = {
      id: id("worksheet", doc.file),
      slug: slugOf(filename),
      chapterId: doc.chapter.id,
      filename,
      title: front?.titel ?? filename,
      chooseMode: front?.["arbeitsweise-wahl"] !== false,
      sections: [],
    };
    if (front?.einleitung) sheet.intro = front.einleitung;
    if (front?.folgeblatt)
      nextFilenames.set(sheet.id, { name: front.folgeblatt, file: doc.file });
    for (const section of sections(doc.lines, 1, doc.file)) {
      const head = sectionHead(section.head, doc.file, section.line);
      const s: Worksheet["sections"][number] = {
        id: id("section", `${doc.file}:${section.line}`),
        title: head.title,
        checkpoint: head.checkpoint,
        items: [],
      };
      let intro: Line[] = [];
      let task: { head: string; line: number; body: Line[] } | null = null;
      const flush = () => {
        if (task) {
          s.items.push({
            type: "task",
            task: parseTask(
              task.head,
              task.body,
              doc.file,
              task.line,
              s.checkpoint,
            ),
          });
          task = null;
        } else if (intro.some((x) => x.text.trim()))
          s.items.push({ type: "content", content: rich(intro, doc.file) });
        intro = [];
      };
      for (const x of section.body) {
        const m = /^## (.*)$/.exec(x.text);
        if (m) {
          flush();
          task = { head: m[1]!, line: x.line, body: [] };
        } else if (task) task.body.push(x);
        else intro.push(x);
      }
      flush();
      const own = s.items.flatMap((x) => (x.type === "task" ? [x.task] : []));
      if (duplicateTitles(own))
        error(
          "TASK_DUPLICATE",
          "Duplicate task title",
          loc(doc.file, section.line),
        );
      sheet.sections.push(s);
    }
    if (!sheet.sections.length)
      error("SECTION_REQUIRED", "Worksheet requires a section", loc(doc.file));
    if (!sheet.sections.some((section) => !section.checkpoint))
      error(
        "SECTION_REQUIRED",
        'Worksheet requires a section # "Title"',
        loc(doc.file),
      );
    if (sheet.sections.filter((section) => section.checkpoint).length > 1)
      error(
        "CHECKPOINT_DUPLICATE",
        "Worksheet has multiple Checkpoints",
        loc(doc.file),
      );
    if (
      sheet.sections.some(
        (section, index) =>
          section.checkpoint && index !== sheet.sections.length - 1,
      )
    )
      error(
        "CHECKPOINT_ORDER",
        "Checkpoint must be the last section",
        loc(doc.file),
      );
    const all = sheet.sections.flatMap((section) =>
      section.items.flatMap((item) =>
        item.type === "task" ? [item.task] : [],
      ),
    );
    if (duplicateTitles(all))
      error(
        "TASK_DUPLICATE",
        "Duplicate task title across Worksheet",
        loc(doc.file),
      );
    const same = worksheets.find(
      (other) =>
        other.chapterId === sheet.chapterId && other.slug === sheet.slug,
    );
    if (same)
      error(
        "SLUG_DUPLICATE",
        `Worksheet ${same.filename}.md and ${filename}.md share the URL name ${sheet.slug} (the number prefix does not count)`,
        loc(doc.file),
      );
    doc.chapter.worksheetIds.push(sheet.id);
    worksheets.push(sheet);
  }
  function parseChallenges(doc: Document) {
    readFront(doc, emptyFrontSchema);
    const top = sections(doc.lines, 1, doc.file);
    if (top.length !== 1 || top[0]!.head !== "Challenges")
      error("CHALLENGE_ROOT", "Expected # Challenges", loc(doc.file));
    const pool: ChallengePool = {
      id: id("challenges", doc.file),
      chapterId: doc.chapter.id,
      challenges: [],
    };
    for (const s of sections(top[0]?.body ?? [], 2, doc.file))
      pool.challenges.push(
        parseTask(s.head, s.body, doc.file, s.line, false, true),
      );
    if (!pool.challenges.length)
      error(
        "CHALLENGE_EMPTY",
        "challenges.md has no Challenges",
        loc(doc.file),
      );
    if (duplicateTitles(pool.challenges))
      error("TASK_DUPLICATE", "Duplicate challenge title", loc(doc.file));
    challengePools.push(pool);
    doc.chapter.challengePoolId = pool.id;
  }
  function parseQuiz(doc: Document) {
    readFront(doc, emptyFrontSchema);
    const top = sections(doc.lines, 1, doc.file);
    if (top.length !== 1)
      error("QUIZ_ROOT", 'Quiz requires exactly one # "Title"', loc(doc.file));
    const quizTitle = quoted(top[0]?.head ?? "");
    if (top[0] && (quizTitle === undefined || !quizTitle.trim()))
      error(
        "HEADING_QUOTES",
        `Quiz title must be in double quotes: # "${top[0].head}"`,
        loc(doc.file, top[0].line),
      );
    const quiz: Quiz = {
      id: id("quiz", doc.file),
      chapterId: doc.chapter.id,
      filename: basename(doc.file, ".md"),
      title: (quizTitle ?? top[0]?.head ?? "").trim(),
      questions: [],
    };
    for (const q of sections(top[0]?.body ?? [], 2, doc.file)) {
      if (q.head === "Frage")
        obsolete("## Frage was replaced by ## Auswahl", doc.file, q.line);
      else if (q.head !== "Auswahl")
        error("QUIZ_QUESTION", "Expected ## Auswahl", loc(doc.file, q.line));
      let multiple = false;
      let afterOptions = false;
      const prompt: Line[] = [],
        options: Quiz["questions"][number]["options"] = [];
      for (const x of q.body) {
        const s = x.text.trim(),
          m = /^- \(([ x])\) (.*)$/.exec(s);
        if (m) {
          afterOptions = true;
          options.push({
            correct: m[1] === "x",
            content: inline(m[2]!, doc.file, x.line),
          });
        } else if (/^- \([^)]+\)/.test(s)) {
          error(
            "QUIZ_OPTION",
            `Invalid Quiz option ${s}`,
            loc(doc.file, x.line),
          );
        } else if (s === "::mehrfach") {
          if (multiple)
            error(
              "QUIZ_ORDER",
              "::mehrfach must occur once per question",
              loc(doc.file, x.line),
            );
          multiple = true;
        } else if (s.startsWith("::"))
          error(
            "MARKER_INVALID",
            `Invalid Quiz marker ${s}`,
            loc(doc.file, x.line),
          );
        else if (s && s !== "---") {
          if (afterOptions)
            error(
              "QUIZ_ORDER",
              "Question prompt must precede options",
              loc(doc.file, x.line),
            );
          prompt.push(x);
        }
      }
      const correct = options.filter((x) => x.correct).length;
      if (
        options.length < 2 ||
        options.length > 4 ||
        !correct ||
        (!multiple && correct !== 1)
      )
        error(
          "QUIZ_SELECTION",
          `Invalid options for question ${quiz.questions.length + 1}`,
          loc(doc.file, q.line),
        );
      quiz.questions.push({
        id: id("question", `${doc.file}:${q.line}`),
        prompt: rich(prompt, doc.file),
        options,
        multiple,
      });
    }
    if (!quiz.questions.length)
      error("QUIZ_EMPTY", "Quiz requires at least one question", loc(doc.file));
    quizzes.push(quiz);
    doc.chapter.quizIds.push(quiz.id);
  }
  function parseSummary(doc: Document) {
    const front = readFront(doc, summaryFrontSchema);
    const summary: Summary = {
      id: id("summary", doc.file),
      chapterId: doc.chapter.id,
      title: front?.titel ?? doc.chapter.name,
      content: [],
      merkkarten: [],
    };
    let normal: Line[] = [],
      card: {
        title: string;
        line: number;
        rule: Line[];
        examples: Line[][];
        current: Line[];
      } | null = null;
    const flushNormal = () => {
      // Outside a Merkkarte, `::beispiel` opens an example that reaches to
      // the next `::beispiel`, a `---` or a heading.
      let part: { example: boolean; line: number; lines: Line[] } = {
        example: false,
        line: 0,
        lines: [],
      };
      const settle = () => {
        if (part.example) {
          const content = rich(part.lines, doc.file);
          if (content.length)
            summary.content.push({ type: "example", content });
          else
            error(
              "EXAMPLE_EMPTY",
              "::beispiel needs content",
              loc(doc.file, part.line),
            );
        } else if (part.lines.some((x) => x.text.trim()))
          summary.content.push({
            type: "content",
            content: rich(part.lines, doc.file),
          });
        part = { example: false, line: 0, lines: [] };
      };
      for (const x of normal) {
        const s = x.text.trim();
        if (s === "::beispiel") {
          settle();
          part = { example: true, line: x.line, lines: [] };
        } else if (part.example && (s === "---" || /^#{1,6} /.test(s))) {
          settle();
          if (s !== "---") part.lines.push(x);
        } else part.lines.push(x);
      }
      settle();
      normal = [];
    };
    const flushCard = () => {
      if (!card) return;
      if (card.examples.length) card.examples.at(-1)!.push(...card.current);
      else card.rule.push(...card.current);
      const cardId = id("merkkarte", `${doc.file}:${card.line}`);
      const anchor = anchorOf(card.title);
      if (
        summary.merkkarten.some(
          (x) => x.title === card!.title || x.anchor === anchor,
        )
      )
        error(
          "MERKKARTE_DUPLICATE",
          `Duplicate Merkkarte ${card.title}`,
          loc(doc.file, card.line),
        );
      summary.merkkarten.push({
        id: cardId,
        title: card.title,
        anchor,
        rule: rich(card.rule, doc.file),
        examples: card.examples.map((x) => rich(x, doc.file)),
      });
      summary.content.push({ type: "merkkarte", id: cardId });
      card = null;
    };
    for (const x of doc.lines) {
      const m = /^## Merkkarte(?::\s*(.*))?$/.exec(x.text.trim());
      if (m) {
        flushCard();
        flushNormal();
        const name =
          m[1] === undefined
            ? undefined
            : quotedTitle(m[1], doc.file, x.line, "The Merkkarte name");
        if (m[1] === undefined)
          error(
            "MERKKARTE_TITLE",
            'Merkkarte requires a name: ## Merkkarte: "Name"',
            loc(doc.file, x.line),
          );
        card = {
          title: name ?? "",
          line: x.line,
          rule: [],
          examples: [],
          current: [],
        };
      } else if (card && x.text.trim() === "::beispiel") {
        if (card.examples.length) card.examples.at(-1)!.push(...card.current);
        else card.rule.push(...card.current);
        card.current = [];
        card.examples.push([]);
      } else if (card && (x.text.trim() === "---" || /^#{1,6} /.test(x.text))) {
        flushCard();
        if (x.text.trim() !== "---") normal.push(x);
      } else if (card) card.current.push(x);
      else if (
        x.text.trim().startsWith("::") &&
        !/^::(?:grafik|beispiel)\b/.test(x.text.trim())
      )
        error(
          "MARKER_INVALID",
          `Invalid marker ${x.text.trim()}`,
          loc(doc.file, x.line),
        );
      else normal.push(x);
    }
    flushCard();
    flushNormal();
    summaries.push(summary);
    doc.chapter.summaryId = summary.id;
    doc.chapter.title = summary.title;
  }
  const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;
  const SLIDE_TAGS: readonly SlideTag[] = [
    "Einstieg",
    "Wiederholung",
    "Plenum",
    "Merke",
    "Ausblick",
    "Aufgabe",
    "Austausch",
  ];
  /** Words of the old free tags, with the word that replaces them. */
  const OLD_TAGS: Record<string, string> = {
    erklären: "Plenum (or no ::tag)",
    knobelei: "Aufgabe",
  };
  /** `::tag Einstieg`: one word of the fixed list. */
  function parseTag(value: string): SlideTag | string {
    const words = value.trim().split(/\s+/).filter(Boolean);
    const tag = SLIDE_TAGS.find(
      (item) => item.toLowerCase() === words[0]?.toLowerCase(),
    );
    const hint = `Expected ::tag ${SLIDE_TAGS.join("|")}`;
    if (tag && words.length === 1) return tag;
    if (tag) return `${hint}; colors are fixed, write ::tag ${tag}`;
    const old = OLD_TAGS[words[0]?.toLowerCase() ?? ""];
    if (old) return `${hint}; ::tag ${words[0]} is now ::tag ${old}`;
    return hint;
  }
  /** `::grafikfolie [Text](pfad.toml)`: a slide that is only a Grafik. */
  function readGraphicSlide(
    entry: SourceEntry,
    marks: Line[],
    body: Line[],
    file: string,
  ) {
    const mark = marks[0]!;
    const where = loc(file, mark.line);
    if (entry.kind !== "slide") {
      error(
        "MARKER_CONTEXT",
        '::grafikfolie requires a slide (# "Title")',
        where,
      );
      return;
    }
    if (marks.length > 1) {
      error("GRAPHIC_SLIDE_DUPLICATE", "Duplicate ::grafikfolie", where);
      return;
    }
    if (body.some((x) => x.text.trim())) {
      error(
        "GRAPHIC_SLIDE_BODY",
        "A ::grafikfolie slide has no other content; only ::tag, ::bis and ::notiz may stand beside it",
        where,
      );
    }
    const m = /^::grafikfolie\s+\[([^\]]*)\]\(([^)]+)\)$/.exec(
      mark.text.trim(),
    );
    if (!m) {
      error(
        "GRAPHIC_SYNTAX",
        "Expected ::grafikfolie [Text](pfad/zur/grafik.toml), the brackets may stay empty",
        where,
      );
      return;
    }
    const graphic = readGraphic(m[2]!, file, mark.line);
    if (!graphic) return;
    if (graphic.input)
      error(
        "GRAPH_INPUT_CONTEXT",
        "A ::grafik with eingabe is only allowed in a Graph task",
        where,
      );
    entry.graphicSlide = { title: m[1]!.trim(), graphic };
  }
  function parseFoliensatz(doc: Document) {
    const front = readFront(doc, foliensatzFrontSchema);
    const fs: Foliensatz = {
      id: id("foliensatz", doc.file),
      chapterId: doc.chapter.id,
      filename: basename(doc.file, ".md"),
      title: front?.titel ?? "",
      inOverview: front?.["in-uebersicht"] !== false,
      entries: [],
    };
    foliensatzByFile.set(doc.file, fs);
    for (const section of sections(doc.lines, 1, doc.file)) {
      const where = loc(doc.file, section.line);
      const head = section.head;
      let kind: SourceEntry["kind"] | undefined,
        entryTitle: string | undefined,
        reference: string | undefined,
        referenceUrl: string | undefined;
      const slideTitle = quoted(head);
      if (slideTitle !== undefined) {
        if (slideTitle.trim()) {
          kind = "slide";
          entryTitle = slideTitle.trim();
        } else error("SLIDE_ENTRY", "Slide title must not be empty", where);
      } else if (head === "Inhalt") kind = "summary";
      else if (/^Folie(?::|$)/.test(head))
        obsolete('# Folie was replaced by # "Title"', doc.file, section.line);
      else if (head === "Zusammenfassung")
        obsolete(
          "# Zusammenfassung was renamed to # Inhalt",
          doc.file,
          section.line,
        );
      else {
        const m = /^(Quiz|Arbeitsblatt|Merkkarte|Foliensatz):\s*(.+)$/.exec(
          head,
        );
        if (!m)
          error(
            "SLIDE_ENTRY",
            `Invalid Foliensatz entry "${head}". Slides are written # "Title"`,
            where,
          );
        else {
          const value = m[2]!.trim(),
            link = LINK.exec(value),
            name = quoted(value);
          const bad = (message: string) => error("SLIDE_ENTRY", message, where);
          if (m[1] === "Merkkarte") {
            if (name !== undefined && name.trim()) {
              kind = "merkkarte";
              reference = name.trim();
            } else if (link) {
              kind = "merkkarte";
              reference = link[1]!;
              referenceUrl = link[2]!;
            } else
              bad(
                'Merkkarte needs a quoted name ("Name") or a link ([Name](../kapitel/inhalt.md#name))',
              );
          } else if (link && m[1] === "Foliensatz") {
            kind = "foliensatz";
            reference = link[1]!;
            referenceUrl = link[2]!;
          } else if (link)
            bad(`${m[1]} references use a file name, not a link`);
          else if (name !== undefined)
            bad(`File references are not quoted: ${m[1]}: ${name}`);
          else if (value.includes("/"))
            obsolete(
              m[1] === "Foliensatz"
                ? "Path notation was replaced by a Markdown link: # Foliensatz: [Name](../kapitel/folien/datei.md)"
                : `${m[1]} references use the file name only`,
              doc.file,
              section.line,
            );
          else if (value.endsWith(".md"))
            bad("File references are written without .md");
          else {
            kind = (
              {
                Quiz: "quiz",
                Arbeitsblatt: "worksheet",
                Foliensatz: "foliensatz",
              } as const
            )[m[1] as "Quiz"];
            reference = value;
          }
        }
      }
      if (!kind) continue;
      const entry: SourceEntry = {
        id: id("entry", `${doc.file}:${section.line}`),
        kind,
        ...(entryTitle ? { title: entryTitle } : {}),
        ...(reference ? { reference } : {}),
        ...(referenceUrl ? { referenceUrl } : {}),
        segments: [],
        location: where,
      };
      const current: Line[] = [],
        note: Line[] = [],
        graphicLines: Line[] = [];
      let inNote = false;
      for (const line of section.body) {
        const value = line.text.trim(),
          timing = /^::bis\s+(\d+):(\d{2})$/.exec(value);
        if (/^::bis\{/.test(value))
          obsolete(
            "::bis{m:ss} was replaced by ::bis m:ss",
            doc.file,
            line.line,
          );
        else if (timing) {
          if (entry.until !== undefined)
            error(
              "TIMING_DUPLICATE",
              "Duplicate ::bis",
              loc(doc.file, line.line),
            );
          entry.until = Number(timing[1]) * 60 + Number(timing[2]);
          if (Number(timing[2]) > 59)
            error("TIMING_VALUE", "Invalid seconds", loc(doc.file, line.line));
        } else if (/^::bis\b/.test(value))
          error(
            "TIMING_VALUE",
            "Expected ::bis m:ss",
            loc(doc.file, line.line),
          );
        else if (/^::tag\b/.test(value)) {
          const tag = parseTag(value.slice(5));
          if (entry.tag || !SLIDE_TAGS.includes(tag as SlideTag))
            error(
              "TAG_SYNTAX",
              entry.tag ? "Duplicate ::tag" : tag,
              loc(doc.file, line.line),
            );
          else entry.tag = tag as SlideTag;
        } else if (/^::grafikfolie\b/.test(value) && !inNote)
          graphicLines.push(line);
        else if (value === "::notiz") {
          if (inNote)
            error(
              "NOTES_DUPLICATE",
              "Duplicate ::notiz",
              loc(doc.file, line.line),
            );
          inNote = true;
        } else if (
          value.startsWith("::") &&
          !/^::platz(?:\s|$)/.test(value) &&
          !/^::merkkarte\b/.test(value) &&
          !/^::schreib(?:flaeche|en)\b/.test(value) &&
          !/^::grafik\b/.test(value)
        )
          error(
            "MARKER_INVALID",
            `Invalid Foliensatz marker ${value}`,
            loc(doc.file, line.line),
          );
        else if (inNote) note.push(line);
        else current.push(line);
      }
      if (note.length) entry.notes = rich(note, doc.file);
      if (graphicLines.length)
        readGraphicSlide(entry, graphicLines, current, doc.file);
      if (
        ["quiz", "foliensatz", "summary"].includes(kind) &&
        current.some((x) => x.text.trim())
      )
        error(
          "ENTRY_BODY",
          `${kind} cannot contain body content`,
          entry.location,
        );
      if (["slide", "worksheet", "merkkarte"].includes(kind)) {
        if (kind !== "slide")
          for (const line of current)
            if (/^::(?:platz|merkkarte)\b/.test(line.text.trim()))
              error(
                "MARKER_CONTEXT",
                '::platz and ::merkkarte require a slide (# "Title")',
                loc(doc.file, line.line),
              );
        let plain: Line[] = [];
        let columns: { name: string; title?: string; lines: Line[] }[] = [];
        const flushPlain = () => {
          if (plain.some((x) => x.text.trim()))
            entry.segments.push({
              type: "content",
              content: rich(plain, doc.file, false, true),
            });
          plain = [];
        };
        const flushColumns = () => {
          if (!columns.length) return;
          if (kind !== "slide")
            error(
              "LAYOUT_CONTEXT",
              'Columns only allowed on slides (# "Title")',
              entry.location,
            );
          const names = columns.map((x) =>
            x.name
              .replace("Mitte Links", "Links Mitte")
              .replace("Rechts Mitte", "Mitte Rechts"),
          );
          if (
            ![
              "Links,Rechts",
              "Links Mitte,Rechts",
              "Links,Mitte Rechts",
              "Links,Mitte,Rechts",
              "Mitte",
            ].includes(names.join(","))
          )
            error(
              "LAYOUT_INVALID",
              `Invalid column sequence ${names.join(", ")}`,
              entry.location,
            );
          const widths =
            names.length === 1
              ? [1]
              : names.length === 3
                ? [1 / 3, 1 / 3, 1 / 3]
                : names[0] === "Links Mitte"
                  ? [2 / 3, 1 / 3]
                  : names[1] === "Mitte Rechts"
                    ? [1 / 3, 2 / 3]
                    : [1 / 2, 1 / 2];
          entry.segments.push({
            type: "columns",
            ...(names.join(",") === "Mitte" ? { centered: true } : {}),
            columns: columns.map((x, i) => ({
              width: widths[i] ?? 1 / 2,
              ...(x.title ? { title: x.title } : {}),
              content: rich(x.lines, doc.file, false, true),
            })),
          });
          columns = [];
        };
        for (const line of current) {
          const layout =
            /^## (Links Mitte|Mitte Links|Mitte Rechts|Rechts Mitte|Links|Mitte|Rechts)(?::\s*(.*))?$/.exec(
              line.text.trim(),
            );
          if (layout) {
            flushPlain();
            const columnTitle =
              layout[2] === undefined
                ? undefined
                : quotedTitle(
                    layout[2],
                    doc.file,
                    line.line,
                    `The title of ${layout[1]}`,
                  );
            columns.push({
              name: layout[1]!,
              ...(columnTitle ? { title: columnTitle } : {}),
              lines: [],
            });
          } else if (line.text.trim() === "---" && columns.length)
            flushColumns();
          else if (columns.length) columns.at(-1)!.lines.push(line);
          else plain.push(line);
        }
        flushColumns();
        flushPlain();
      }
      fs.entries.push(entry);
    }
    if (!fs.entries.length)
      error("FOLIENSATZ_EMPTY", "Foliensatz requires entries", loc(doc.file));
    foliensaetze.push(fs);
    doc.chapter.foliensatzIds.push(fs.id);
  }
  const renamedDirs: Record<string, string> = {
    worksheets: "aufgaben",
    quizzes: "quiz",
    foliensaetze: "folien",
  };
  for (const absolute of walk(root).sort()) {
    const name = basename(absolute),
      parent = basename(dirname(absolute)),
      rel = relative(root, absolute).split(sep);
    if (rel[0] === "kurse") continue;
    if (
      (rel.length === 4 && name === "summary.md") ||
      (rel.length === 5 && Object.hasOwn(renamedDirs, parent))
    ) {
      recognizedDocuments++;
      obsolete(
        name === "summary.md" && rel.length === 4
          ? "summary.md was renamed to inhalt.md"
          : `${parent}/ was renamed to ${renamedDirs[parent]}/`,
        rel.join("/"),
        1,
      );
      continue;
    }
    if (
      !["inhalt.md", "challenges.md"].includes(name) &&
      !["aufgaben", "quiz", "folien"].includes(parent)
    )
      continue;
    const doc = document(absolute);
    if (!doc) continue;
    recognizedDocuments++;
    if (name === "inhalt.md") parseSummary(doc);
    else if (name === "challenges.md") parseChallenges(doc);
    else if (parent === "aufgaben") parseWorksheet(doc);
    else if (parent === "quiz") parseQuiz(doc);
    else if (parent === "folien") parseFoliensatz(doc);
  }
  const chapterById = new Map([...chapters.values()].map((c) => [c.id, c]));
  const summaryByChapter = new Map(summaries.map((s) => [s.chapterId, s]));
  function pickCard(
    chapter: Chapter,
    wanted: (card: Summary["merkkarten"][number]) => boolean,
    label: string,
    where: Location,
    chain?: string[],
  ): string | undefined {
    const matches =
      summaryByChapter.get(chapter.id)?.merkkarten.filter(wanted) ?? [];
    if (matches.length !== 1) {
      error(
        matches.length ? "MERKKARTE_AMBIGUOUS" : "MERKKARTE_MISSING",
        `Cannot resolve Merkkarte ${label}`,
        where,
        chain,
      );
      return;
    }
    return matches[0]!.id;
  }
  /** `# Merkkarte: "Name"`: the Merkkarte of the given chapter, by name. */
  const cardByName = (
    name: string,
    chapter: Chapter,
    where: Location,
    chain?: string[],
  ) => pickCard(chapter, (c) => c.title === name, name, where, chain);
  /** A relative Markdown link to `<chapter>/inhalt.md#anchor`, resolved from the referencing file. */
  function cardByLink(
    url: string,
    fromFile: string,
    where: Location,
    chain?: string[],
  ): string | undefined {
    const hash = url.indexOf("#");
    const path = hash < 0 ? url : url.slice(0, hash);
    let anchor = hash < 0 ? "" : url.slice(hash + 1);
    try {
      anchor = decodeURIComponent(anchor);
    } catch {
      // keep the raw fragment
    }
    anchor = anchor.toLowerCase();
    const target = posix.normalize(posix.join(posix.dirname(fromFile), path));
    const m = /^([^/]+)\/([^/]+)\/([^/]+)\/inhalt\.md$/.exec(target);
    if (!m) {
      error(
        "LINK_TARGET",
        `Merkkarte link must point to a chapter's inhalt.md: ${url}`,
        where,
        chain,
      );
      return;
    }
    const chapter = chapters.get(`${m[1]}/${m[2]}/${m[3]}`);
    if (!chapter) {
      error(
        "CHAPTER_MISSING",
        `Missing chapter ${m[1]}/${m[2]}/${m[3]}`,
        where,
        chain,
      );
      return;
    }
    if (!anchor) {
      error(
        "LINK_ANCHOR",
        `Merkkarte link needs an #anchor: ${url}`,
        where,
        chain,
      );
      return;
    }
    return pickCard(
      chapter,
      (c) => c.anchor === anchor,
      `#${anchor}`,
      where,
      chain,
    );
  }
  for (const { node, file, line } of pendingLinks) {
    if (node.type !== "link") continue;
    const targetId = cardByLink(node.url, file, loc(file, line));
    if (!targetId) continue;
    const title = node.children
      .map((c) => (c.type === "text" ? c.value : ""))
      .join("");
    for (const key of Object.keys(node))
      delete (node as Record<string, unknown>)[key];
    Object.assign(node, { type: "merkkarteRef", targetId, title });
  }
  for (const card of pendingCards) {
    const where = loc(card.file, card.line);
    let targetId: string | undefined;
    if (card.url) targetId = cardByLink(card.url, card.file, where);
    else {
      const m = /^([^/]+)\/([^/]+)\/([^/]+)\//.exec(card.file);
      const chapter = m && chapters.get(`${m[1]}/${m[2]}/${m[3]}`);
      if (chapter) targetId = cardByName(card.name!, chapter, where);
    }
    if (targetId) card.node.targetId = targetId;
  }
  function reference(
    list: { id: string; chapterId: string; filename: string }[],
    chapter: Chapter,
    name: string,
    where: Location,
    kind: string,
  ): string | undefined {
    const matches = list.filter(
      (x) => x.chapterId === chapter.id && x.filename === name,
    );
    if (matches.length !== 1) {
      error(
        matches.length ? "REFERENCE_AMBIGUOUS" : "REFERENCE_MISSING",
        `Cannot resolve ${kind} ${name}`,
        where,
      );
      return;
    }
    return matches[0]!.id;
  }
  for (const sheet of worksheets) {
    const next = nextFilenames.get(sheet.id);
    if (next)
      sheet.nextWorksheetId = reference(
        worksheets,
        chapterById.get(sheet.chapterId)!,
        next.name,
        loc(next.file),
        "worksheet",
      );
  }
  for (const pool of challengePools) {
    const chapter = chapterById.get(pool.chapterId)!;
    for (const challenge of pool.challenges)
      if (challenge.prerequisites)
        challenge.prerequisites = challenge.prerequisites.map(
          (name) =>
            reference(
              worksheets,
              chapter,
              name,
              loc(
                `${chapter.group}/${chapter.topic}/${chapter.name}/challenges.md`,
              ),
              "prerequisite",
            ) ?? "",
        );
  }
  const fsById = new Map(foliensaetze.map((f) => [f.id, f]));
  for (const fs of foliensaetze) {
    const chapter = chapterById.get(fs.chapterId)!;
    for (const entry of fs.entries) {
      if (entry.kind === "worksheet")
        entry.targetId = reference(
          worksheets,
          chapter,
          entry.reference!,
          entry.location,
          "worksheet",
        );
      if (entry.kind === "quiz")
        entry.targetId = reference(
          quizzes,
          chapter,
          entry.reference!,
          entry.location,
          "quiz",
        );
      if (entry.kind === "foliensatz") {
        if (entry.referenceUrl) {
          const path = entry.referenceUrl.split("#")[0]!;
          const target = posix.normalize(
            posix.join(posix.dirname(entry.location.file), path),
          );
          const found = foliensatzByFile.get(target);
          if (!/^[^/]+\/[^/]+\/[^/]+\/folien\/[^/]+\.md$/.test(target))
            error(
              "LINK_TARGET",
              `Foliensatz link must point to a .md file in a chapter's folien/ folder: ${entry.referenceUrl}`,
              entry.location,
            );
          else if (!found)
            error(
              "REFERENCE_MISSING",
              `Cannot resolve foliensatz ${entry.referenceUrl}`,
              entry.location,
            );
          else entry.targetId = found.id;
        } else
          entry.targetId = reference(
            foliensaetze,
            chapter,
            entry.reference!,
            entry.location,
            "foliensatz",
          );
      }
    }
  }
  const presentations: Bundle["presentations"] = [];
  function expand(rootFs: Foliensatz) {
    const rootChapter = chapterById.get(rootFs.chapterId)!;
    const placements: Placement[] = [];
    const visit = (fs: Foliensatz, path: string[], chain: string[]) => {
      let previousUntil: number | undefined = 0;
      for (const entry of fs.entries) {
        const nextPath = [...path, entry.id];
        if (entry.kind === "foliensatz") {
          const target = entry.targetId
            ? fsById.get(entry.targetId)
            : undefined;
          if (!target) continue;
          if (chain.includes(target.id)) {
            error(
              "FOLIENSATZ_CYCLE",
              `Cycle through ${target.filename}`,
              entry.location,
              [
                ...chain.map((x) => fsById.get(x)?.filename ?? x),
                target.filename,
              ],
            );
            continue;
          }
          const last = target.entries.at(-1)?.until;
          if (
            entry.until !== undefined &&
            last !== undefined &&
            previousUntil !== undefined
          ) {
            const assigned = entry.until - previousUntil;
            if (assigned !== last)
              warn(
                "TIMING_MISMATCH",
                `Assigned ${assigned}s; ${target.filename} ends at ${last}s`,
                entry.location,
              );
          }
          const firstPlacement = placements.length;
          visit(target, nextPath, [...chain, target.id]);
          if (entry.notes?.length && placements[firstPlacement]) {
            placements[firstPlacement]!.noteSourceEntryIds ??= [];
            placements[firstPlacement]!.noteSourceEntryIds!.unshift(entry.id);
          }
        } else {
          let targetId = entry.targetId;
          const names = chain.map((x) => fsById.get(x)?.filename ?? x);
          if (entry.kind === "summary") {
            targetId = summaryByChapter.get(rootChapter.id)?.id;
            if (!targetId)
              error(
                "SUMMARY_MISSING",
                `Missing inhalt.md for ${rootChapter.name}`,
                entry.location,
                names,
              );
          }
          if (entry.kind === "merkkarte")
            targetId = entry.referenceUrl
              ? cardByLink(
                  entry.referenceUrl,
                  entry.location.file,
                  entry.location,
                  names,
                )
              : cardByName(
                  entry.reference!,
                  rootChapter,
                  entry.location,
                  names,
                );
          placements.push({
            id: id("placement", `${rootFs.id}/${nextPath.join("/")}`),
            sourceEntryId: entry.id,
            sourceFoliensatzId: fs.id,
            kind: entry.kind,
            targetId,
            title: entry.title,
            until: entry.until,
            inclusionPath: nextPath,
          });
        }
        previousUntil = entry.until;
      }
    };
    visit(rootFs, [rootFs.id], [rootFs.id]);
    presentations.push({
      id: id("presentation", rootFs.id),
      rootFoliensatzId: rootFs.id,
      chapterId: rootFs.chapterId,
      title: rootFs.title,
      placements,
    });
  }
  foliensaetze.forEach(expand);
  /** Topic folders carry thema.toml (titel, icon) and an optional icon.svg. */
  const topics: Topic[] = [];
  const topicFolders = new Map<string, Topic>();
  for (const key of [
    ...new Set([...chapters.values()].map((c) => `${c.group}/${c.topic}`)),
  ].sort()) {
    const [group, folder] = key.split("/") as [string, string];
    const file = `${key}/thema.toml`,
      absolute = join(root, file);
    if (!existsSync(absolute)) {
      error(
        "TOPIC_MISSING",
        `Topic folder ${key} needs a thema.toml with titel`,
        loc(file),
      );
      continue;
    }
    const data = readToml(readFileSync(absolute, "utf8"), topicSchema, file, {
      code: "TOPIC_CONFIG",
      unknownKeyCode: "FRONT_FIELD",
    });
    if (!data) continue;
    const svg = existsSync(join(root, key, "icon.svg"));
    if (svg && data.icon !== undefined)
      error("TOPIC_ICON", "Use either icon.svg or icon =, not both", loc(file));
    if (topicFolders.has(folder))
      error(
        "TOPIC_DUPLICATE",
        `Topic folder name ${folder} is used in ${topicFolders.get(folder)!.group} and ${group}`,
        loc(file),
      );
    const topic: Topic = {
      id: id("topic", key),
      group,
      folder,
      title: data.titel,
      ...(svg
        ? { icon: { assetId: asset("icon.svg", file, 1) } }
        : data.icon !== undefined
          ? { icon: { gallery: data.icon } }
          : {}),
    };
    topics.push(topic);
    topicFolders.set(folder, topic);
  }
  const courses: Course[] = [];
  const publishedCourses = new Set<string>();
  const kurse = join(root, "kurse");
  if (existsSync(kurse))
    for (const entry of readdirSync(kurse).sort()) {
      if (!entry.endsWith(".toml")) continue;
      const courseId = basename(entry, ".toml");
      if (options.courses && !options.courses.includes(courseId)) continue;
      publishedCourses.add(courseId);
      const file = `kurse/${entry}`;
      const data = readToml(
        readFileSync(join(kurse, entry), "utf8"),
        courseSchema,
        file,
        { code: "COURSE_CONFIG", unknownKeyCode: "FRONT_FIELD" },
      );
      if (!data) continue;
      const course: Course = { id: courseId, title: data.titel, topics: [] };
      const courseChapters = new Map<string, Chapter>();
      const chapterRefs = new Map<string, string>();
      for (const [folder, list] of Object.entries(data.themen)) {
        const topic = topicFolders.get(folder);
        if (!topic) {
          error("COURSE_TOPIC", `Unknown topic folder ${folder}`, loc(file));
          continue;
        }
        const chapterIds: string[] = [];
        for (const name of list) {
          const chapter = chapters.get(`${topic.group}/${folder}/${name}`);
          if (!chapter)
            error(
              "COURSE_CHAPTER",
              `Unknown chapter ${folder}/${name}`,
              loc(file),
            );
          else if (chapterIds.includes(chapter.id))
            error(
              "COURSE_CHAPTER",
              `Duplicate chapter ${folder}/${name}`,
              loc(file),
            );
          else {
            const same = courseChapters.get(chapter.slug);
            if (same)
              error(
                "SLUG_DUPLICATE",
                `Chapters ${same.topic}/${same.name} and ${folder}/${name} share the URL name ${chapter.slug} in course ${courseId} (the number prefix does not count)`,
                loc(file),
              );
            courseChapters.set(chapter.slug, chapter);
            chapterRefs.set(`${folder}/${name}`, chapter.id);
            chapterIds.push(chapter.id);
          }
        }
        course.topics.push({ topicId: topic.id, chapterIds });
      }
      if (data.aktuell !== undefined) {
        const current = chapterRefs.get(data.aktuell);
        if (current === undefined)
          error(
            "COURSE_CHAPTER",
            `aktuell: ${data.aktuell} is not a chapter of this course (write topic folder/chapter as in themen)`,
            loc(file),
          );
        else course.currentChapterId = current;
      }
      courses.push(course);
    }
  for (const courseId of options.courses ?? [])
    if (!publishedCourses.has(courseId))
      error(
        "COURSE_UNKNOWN",
        `Published course ${courseId} has no kurse/${courseId}.toml`,
        loc("kurse"),
      );
  const timetable: Bundle["timetable"] = { periods: [] };
  if (existsSync(join(root, "definitions.toml"))) {
    const data = readToml(
      readFileSync(join(root, "definitions.toml"), "utf8"),
      definitionsSchema,
      "definitions.toml",
      { code: "TIMETABLE", unknownKeyCode: "FRONT_FIELD" },
    );
    if (data) timetable.periods = data.stundenplan;
  }
  if (!recognizedDocuments)
    error("CONTENT_EMPTY", "No v1 StudyLuma documents found", loc("."));
  if (diagnostics.some((x) => x.severity === "error"))
    throw new CompileFailure(diagnostics);
  const base = {
    schemaVersion: CATALOG_FORMAT_VERSION,
    timetable,
    topics,
    courses,
    chapters: [...chapters.values()],
    summaries,
    worksheets,
    challengePools,
    quizzes,
    foliensaetze,
    presentations,
    assets: [...assets.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
  const buildId = computeCatalogBuildId(base);
  return { bundle: { ...base, buildId }, diagnostics, files };
}
/** `catalog.meta.json` of a build: deterministic, it names no time and no machine. */
export function catalogMeta(buildId: string): CatalogArtifactMeta {
  return {
    formatVersion: CATALOG_FORMAT_VERSION,
    buildId,
    compiler: { name: compilerPackage.name, version: compilerPackage.version },
  };
}

/** Writes the files of a catalog artifact into `directory`, creating it if needed. */
export function writeCatalogFiles(
  directory: string,
  {
    bundle,
    files,
  }: Pick<ReturnType<typeof compileContent>, "bundle" | "files">,
) {
  mkdirSync(directory, { recursive: true });
  for (const [path, bytes] of files) {
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
  writeFileSync(
    join(directory, CATALOG_FILE),
    JSON.stringify(bundle, null, 2) + "\n",
  );
  writeFileSync(
    join(directory, CATALOG_META_FILE),
    serializeCatalogMeta(catalogMeta(bundle.buildId)),
  );
  writeFileSync(
    join(directory, "asset-manifest.json"),
    JSON.stringify(
      {
        schemaVersion: CATALOG_FORMAT_VERSION,
        buildId: bundle.buildId,
        assets: bundle.assets,
      },
      null,
      2,
    ) + "\n",
  );
}

export function writeBuild(contentRoot: string, outputRoot: string) {
  const compiled = compileContent(contentRoot);
  const { bundle, diagnostics } = compiled;
  const versionRoot = resolve(outputRoot, "v1"),
    final = join(versionRoot, bundle.buildId),
    temporary = join(versionRoot, `.tmp-${process.pid}-${Date.now()}`);
  if (existsSync(final)) {
    // Builds are immutable. One written before `catalog.meta.json` existed only gets that file.
    if (!existsSync(join(final, CATALOG_META_FILE)))
      writeFileSync(
        join(final, CATALOG_META_FILE),
        serializeCatalogMeta(catalogMeta(bundle.buildId)),
      );
    return { bundle, diagnostics, path: final };
  }
  try {
    writeCatalogFiles(temporary, compiled);
    renameSync(temporary, final);
  } catch (e) {
    rmSync(temporary, { recursive: true, force: true });
    throw e;
  }
  return { bundle, diagnostics, path: final };
}
