/**
 * Parser for slides using slides-style-new.typ.
 *
 * Each `= Title` section maps to one slide. The slide type macro
 * (hookSlide, conceptSlide, …) is treated as a layout macro: it owns the
 * section and its two optional content blocks [body][material].
 *
 * Inline macros inside the body block:
 *   #focus[...]   → focus field
 *   #result[...]  → result field (text or nested material)
 *   #pn[...]      → presenterNotes field
 *   #col[T][B]    → column entry (compareSlide only)
 *   #formula[...] → material
 *   #image(...)   → material
 *   #link(...)    → material
 *
 * Remaining text in the body is parsed as a bullet list (lines starting with "- ").
 */

import { protectCodeBlocks, restoreCodeBlocks } from "./codeBlockGuard";
import { splitMacroAndText, type RawMacroBlock } from "./macros/splitMacroAndText";
import { parseParams } from "./macros/parseParams";
import { translateTypstMathInMarkdown } from "./utils/typstMathToKatex";
import type {
  TypedSlideDeck,
  TypedSlide,
  SlideContentItem,
  SectionSlide,
  HookSlide,
  ConceptSlide,
  CompareSlide,
  CompareColumn,
  ExampleSlide,
  PromptSlide,
  TaskSlide,
  RecapSlide,
  QuizSlide,
  QuizQuestion,
} from "@schema/slideTypes";
import type { ProtectedBlock } from "./codeBlockGuard";

export const NEW_SLIDE_MARKER = "slides-style-new.typ";

export function isNewSlideFormat(fileContent: string): boolean {
  return fileContent.includes(NEW_SLIDE_MARKER);
}

export async function parseTypedSlideDeck(filePath: string, fileContent: string): Promise<TypedSlideDeck> {
  const { protectedContent, protectedBlocks } = protectCodeBlocks(fileContent);

  const headerRegex = /^= (.+)$/gm;
  const matches = [...protectedContent.matchAll(headerRegex)];

  if (matches.length === 0) {
    throw new Error(`No slide headers found in ${filePath}`);
  }

  const title = restoreText(matches[0][1].trim(), protectedBlocks);
  const slides: TypedSlide[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const header = restoreText(match[1].trim(), protectedBlocks);

    const start = match.index! + match[0].length;
    const end = matches[i + 1]?.index ?? protectedContent.length;
    const sectionContent = protectedContent.slice(start, end).trim();

    const rawNodes = splitMacroAndText(sectionContent);
    const slideMacros = rawNodes.filter((n): n is RawMacroBlock => "type" in n && isSlideType(n.type));

    if (slideMacros.length === 0) continue;

    for (const slideMacro of slideMacros) {
      const slide = parseSlideNode(slideMacro, header, protectedBlocks);
      if (slide) slides.push(slide);
    }
  }

  return { title, content: slides };
}

// ─── Slide Type Registry ──────────────────────────────────────────────────────

const SLIDE_TYPES = new Set([
  "sectionSlide", "hookSlide", "conceptSlide", "compareSlide",
  "exampleSlide", "promptSlide", "taskSlide", "recapSlide", "quizSlide",
]);

function isSlideType(type: string): boolean {
  return SLIDE_TYPES.has(type);
}

function parseSlideNode(node: RawMacroBlock, header: string, pb: ProtectedBlock[]): TypedSlide | null {
  switch (node.type) {
    case "sectionSlide": return parseSectionSlide(node, header, pb);
    case "hookSlide":    return parseBodyMaterialSlide(node, header, pb, "hookSlide");
    case "conceptSlide": return parseBodyMaterialSlide(node, header, pb, "conceptSlide");
    case "compareSlide": return parseCompareSlide(node, header, pb);
    case "exampleSlide": return parseExampleSlide(node, header, pb);
    case "promptSlide":  return parsePromptSlide(node, header, pb);
    case "taskSlide":    return parseTaskSlide(node, header, pb);
    case "recapSlide":   return parseRecapSlide(node, header, pb);
    case "quizSlide":    return parseQuizSlide(node, header, pb);
    default:             return null;
  }
}


// ─── Per-type Parsers ─────────────────────────────────────────────────────────

function getReveal(node: RawMacroBlock, pb: ProtectedBlock[]): "manual" | undefined {
  const params = node.params ? parseParams(restoreText(node.params, pb)) : {};
  const val = (params.reveal as string | undefined)?.replace(/^["']|["']$/g, "");
  return val === "manual" ? "manual" : undefined;
}

function parseSectionSlide(node: RawMacroBlock, header: string, pb: ProtectedBlock[]): SectionSlide {
  const subtitle = node.content ? restoreText(node.content.trim(), pb) : undefined;
  return { slideType: "sectionSlide", header, subtitle };
}

function parseBodyMaterialSlide(
  node: RawMacroBlock, header: string, pb: ProtectedBlock[],
  slideType: "hookSlide" | "conceptSlide"
): HookSlide | ConceptSlide {
  const body = parseBodyContent(node.content ?? "", pb);
  const material = node.content2 ? parseMaterialBlock(node.content2, pb) : undefined;

  return {
    slideType,
    header,
    reveal: getReveal(node, pb),
    focus: body.focus,
    bullets: body.bullets?.length ? body.bullets : undefined,
    inlineMaterial: body.material,
    material,
    presenterNotes: body.presenterNotes,
  };
}

function parseCompareSlide(node: RawMacroBlock, header: string, pb: ProtectedBlock[]): CompareSlide {
  const body = parseBodyContent(node.content ?? "", pb, true);

  let result: string | undefined;
  if (body.resultContent?.type === "text") result = body.resultContent.content;

  return {
    slideType: "compareSlide",
    header,
    reveal: getReveal(node, pb),
    focus: body.focus,
    columns: body.columns ?? [],
    result,
    presenterNotes: body.presenterNotes,
  };
}

function parseExampleSlide(node: RawMacroBlock, header: string, pb: ProtectedBlock[]): ExampleSlide {
  const body = parseBodyContent(node.content ?? "", pb);
  const material = node.content2 ? parseMaterialBlock(node.content2, pb) : undefined;

  return {
    slideType: "exampleSlide",
    header,
    reveal: getReveal(node, pb),
    bullets: body.bullets?.length ? body.bullets : undefined,
    result: body.resultContent,
    inlineMaterial: body.material,
    material,
    presenterNotes: body.presenterNotes,
  };
}

function parsePromptSlide(node: RawMacroBlock, header: string, pb: ProtectedBlock[]): PromptSlide {
  const body = parseBodyContent(node.content ?? "", pb);
  const material = node.content2 ? parseMaterialBlock(node.content2, pb) : undefined;

  return {
    slideType: "promptSlide",
    header,
    reveal: getReveal(node, pb),
    focus: body.focus,
    bullets: body.bullets?.length ? body.bullets : undefined,
    result: body.resultContent,
    inlineMaterial: body.material,
    material,
    presenterNotes: body.presenterNotes,
  };
}

function parseTaskSlide(node: RawMacroBlock, header: string, pb: ProtectedBlock[]): TaskSlide {
  const body = parseBodyContent(node.content ?? "", pb);
  const material = node.content2 ? parseMaterialBlock(node.content2, pb) : undefined;

  let result: string | undefined;
  if (body.resultContent?.type === "text") result = body.resultContent.content;

  return {
    slideType: "taskSlide",
    header,
    reveal: getReveal(node, pb),
    focus: body.focus,
    bullets: body.bullets?.length ? body.bullets : undefined,
    result,
    inlineMaterial: body.material,
    material,
    presenterNotes: body.presenterNotes,
  };
}

function parseRecapSlide(node: RawMacroBlock, header: string, pb: ProtectedBlock[]): RecapSlide {
  const body = parseBodyContent(node.content ?? "", pb);
  return {
    slideType: "recapSlide",
    header,
    bullets: body.bullets ?? [],
    presenterNotes: body.presenterNotes,
  };
}

function parseQuizSlide(node: RawMacroBlock, header: string, pb: ProtectedBlock[]): QuizSlide {
  const bodyText = node.content ? restoreText(node.content, pb) : "";
  const questions = parseQuizQuestions(bodyText);
  return { slideType: "quizSlide", header, questions };
}


// ─── Body Content Parser ──────────────────────────────────────────────────────

type ParsedBody = {
  focus?: string;
  resultContent?: SlideContentItem;
  presenterNotes?: string;
  bullets?: string[];
  material?: SlideContentItem;
  columns?: CompareColumn[];
};

function parseBodyContent(bodyText: string, pb: ProtectedBlock[], captureColumns = false): ParsedBody {
  const nodes = splitMacroAndText(bodyText);
  const result: ParsedBody = {};
  const bullets: string[] = [];
  const textParagraphs: string[] = [];

  for (const node of nodes) {
    if ("rawText" in node) {
      const restored = restoreText(node.rawText, pb);

      // Split into segments: fenced code blocks stay as markdown, other lines become bullets or text
      // We process line by line but keep track of whether we're inside a code block
      const lines = restored.split(/\r?\n/);
      const paraLines: string[] = [];
      let inFence = false;
      let fenceLines: string[] = [];

      const flushPara = () => {
        const t = paraLines.join("\n").trim();
        if (t) textParagraphs.push(t);
        paraLines.length = 0;
      };

      for (const line of lines) {
        if (!inFence && line.trim().startsWith("```")) {
          flushPara();
          inFence = true;
          fenceLines = [line];
        } else if (inFence) {
          fenceLines.push(line);
          if (line.trim() === "```" || (fenceLines.length > 1 && line.trim().startsWith("```"))) {
            inFence = false;
            textParagraphs.push(fenceLines.join("\n"));
            fenceLines = [];
          }
        } else {
          const trimmed = line.trim();
          if (trimmed.startsWith("- ")) {
            flushPara();
            bullets.push(toMd(trimmed.slice(2).trim()));
          } else if (trimmed && bullets.length > 0 && paraLines.length === 0) {
            bullets[bullets.length - 1] += "\n" + toMd(trimmed);
          } else if (trimmed) {
            paraLines.push(toMd(trimmed));
          }
        }
      }

      if (inFence && fenceLines.length > 0) textParagraphs.push(fenceLines.join("\n"));
      flushPara();
    } else {
      switch (node.type) {
        case "focus":
          result.focus = node.content ? toMd(restoreText(node.content, pb)) : undefined;
          break;
        case "pn":
          result.presenterNotes = node.content ? restoreText(node.content, pb).trim() : undefined;
          break;
        case "result":
          result.resultContent = node.content
            ? parseResultBody(node.content, pb)
            : undefined;
          break;
        case "col":
          if (captureColumns) {
            const title = node.content ? toMd(restoreText(node.content, pb)) : "";
            const body  = node.content2 ? toMd(restoreText(node.content2, pb)) : "";
            if (!result.columns) result.columns = [];
            result.columns.push({ title, body });
          }
          break;
        case "formula":
        case "image":
        case "link":
        case "codeRunner":
          result.material = parseMaterialNode(node, pb);
          break;
      }
    }
  }

  if (bullets.length > 0) result.bullets = bullets;

  // Fall back to plain text paragraphs as material if no other material was found
  if (!result.material && textParagraphs.length > 0) {
    result.material = { type: "text", content: textParagraphs.join("\n\n") };
  }

  return result;
}

/** Parse the body of a #result[...] block — may be plain text or a material macro. */
function parseResultBody(bodyText: string, pb: ProtectedBlock[]): SlideContentItem {
  const nodes = splitMacroAndText(bodyText);

  // If the body contains a material macro, return it as the result
  for (const node of nodes) {
    if (!("rawText" in node)) {
      const material = parseMaterialNode(node, pb);
      if (material) return material;
    }
  }

  // Otherwise collect all text
  const parts: string[] = [];
  for (const node of nodes) {
    if ("rawText" in node) {
      parts.push(restoreText(node.rawText, pb).trim());
    }
  }
  return { type: "text", content: toMd(parts.join("\n").trim()) };
}

/** Parse a second content block that should contain a single material macro. */
function parseMaterialBlock(blockText: string, pb: ProtectedBlock[]): SlideContentItem | undefined {
  const nodes = splitMacroAndText(blockText);
  for (const node of nodes) {
    if (!("rawText" in node)) {
      const material = parseMaterialNode(node, pb);
      if (material) return material;
    }
  }
  return undefined;
}

/** Parse a #formula / #image / #link macro node into a SlideContentItem. */
function parseMaterialNode(node: RawMacroBlock, pb: ProtectedBlock[]): SlideContentItem | undefined {
  const params = node.params ? parseParams(restoreText(node.params, pb)) : {};

  switch (node.type) {
    case "formula": {
      const rawExpr = node.content
        ? restoreText(node.content, pb)
        : undefined;
      if (!rawExpr) return undefined;
      return { type: "formula", expr: stripTypstBlock(rawExpr) };
    }
    case "image": {
      const file = params.file as string | undefined;
      if (!file) return undefined;
      const rawLabel = params.label as string | undefined;
      const label = rawLabel ? toMd(stripTypstBlock(rawLabel)) : undefined;
      return { type: "image", file, label };
    }
    case "link": {
      const url = params.url as string | undefined;
      if (!url) return undefined;
      const rawLabel = params.label as string | undefined;
      const label = rawLabel ? toMd(stripTypstBlock(rawLabel)) : undefined;
      return { type: "link", url, label };
    }
    case "codeRunner": {
      const content = node.content ? restoreCodeBlocks({ rawText: node.content }, pb).rawText : "";
      const fenceMatch = content.match(/```(\w+)\n([\s\S]*?)```/);
      if (!fenceMatch) return undefined;
      return { type: "codeRunner", language: fenceMatch[1], code: fenceMatch[2].trimEnd() };
    }
    default:
      return undefined;
  }
}


// ─── Quiz Parser ──────────────────────────────────────────────────────────────

const CHECKBOX_LINE_REGEX = /^-\s*\[[xX ]\]/;
const CHECKBOX_OPTION_REGEX = /^-\s*\[([xX ])\]\s*(.+)$/;

function parseQuizQuestions(rawText: string): QuizQuestion[] {
  const lines = rawText.split(/\r?\n/);
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let inOptions = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      currentBlock.push(line);
      continue;
    }

    if (CHECKBOX_LINE_REGEX.test(trimmed)) {
      inOptions = true;
      currentBlock.push(line);
    } else {
      if (inOptions) {
        const block = currentBlock.join("\n").trim();
        if (block) blocks.push(block);
        currentBlock = [line];
        inOptions = false;
      } else {
        currentBlock.push(line);
      }
    }
  }

  const lastBlock = currentBlock.join("\n").trim();
  if (lastBlock) blocks.push(lastBlock);

  return blocks.map(parseQuizBlock);
}

function parseQuizBlock(rawText: string): QuizQuestion {
  const lines = rawText.split(/\r?\n/);
  const firstOptionIndex = lines.findIndex(l => CHECKBOX_LINE_REGEX.test(l.trim()));

  const question = firstOptionIndex > 0
    ? toMd(lines.slice(0, firstOptionIndex).join("\n").trim())
    : toMd(lines[0]?.trim() ?? "");

  const options: { text: string; correct: boolean }[] = [];
  for (let i = Math.max(0, firstOptionIndex); i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    const match = CHECKBOX_OPTION_REGEX.exec(raw);
    if (!match) continue;
    options.push({ text: toMd(match[2].trim()), correct: match[1].toLowerCase() === "x" });
  }

  return { question, options };
}


// ─── Text Helpers ─────────────────────────────────────────────────────────────

/** Restore code-block placeholders from protected blocks. */
function restoreText(text: string, pb: ProtectedBlock[]): string {
  return translateTypstMathInMarkdown(
    restoreCodeBlocks({ rawText: text }, pb).rawText
  );
}

/** Convert Typst bold (*text*) to Markdown bold (**text**). */
function toMd(text: string): string {
  return text.replace(/\*(.*?)\*/g, "**$1**");
}

/**
 * Strip surrounding [ ] from a Typst content-block value that arrived as
 * a raw parameter string, e.g. "[$ f(x) = x^2 $]" → "$ f(x) = x^2 $".
 */
function stripTypstBlock(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}
