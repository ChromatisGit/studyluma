import type { Markdown } from "@schema/page";
import type { RawText } from "@pipeline/types";
import type { ProtectedBlock } from "@pipeline/pageParser/codeBlockGuard";
import type { Macro } from "@macros/registry";
import type { MacroGroup } from "@schema/page";
import type { SlideSplitMacro } from "@macros/slideSplit/types";
import type { SlideMainMacro } from "@macros/slideMain/types";
import type { StepsMacro } from "@macros/steps/types";
import { parseMacroType } from "./macroRegistry";
import { Params, parseParams } from "./parseParams";
import { parseRawText, type ContentType } from "@pipeline/pageParser/macros/parserUtils";
import { RawMacroBlock, RawNode, splitMacroAndText } from "./splitMacroAndText";

export type RawMacro = {
    type: string,
    filePath: string,
    protectedBlocks: ProtectedBlock[],
    params?: Params,
    inlineMacros?: InlineMacros
    content?: RawText,
}

type InlineMacros = Record<string, RawText>


// ─── Layout Macro Registry ────────────────────────────────────────────────────

type LayoutParser = (
    node: RawMacroBlock,
    protectedBlocks: ProtectedBlock[],
    filePath: string,
    contentType?: ContentType
) => Macro | MacroGroup;

const layoutMacroRegistry = new Map<string, LayoutParser>([
    ["group",      parseGroupContent],
    ["slideSplit", parseSlideSplitContent],
    ["slideMain",  parseSlideMainContent],
    ["steps",      parseStepsContent],
]);

export function isLayoutMacro(type: string): boolean {
    return layoutMacroRegistry.has(type);
}

export function parseLayoutMacro(
    node: RawMacroBlock,
    protectedBlocks: ProtectedBlock[],
    filePath: string,
    contentType?: ContentType
): Macro | MacroGroup {
    const parser = layoutMacroRegistry.get(node.type)!;
    return parser(node, protectedBlocks, filePath, contentType);
}


// ─── Layout Macro Parsers ─────────────────────────────────────────────────────

function parseGroupContent(node: RawMacroBlock, protectedBlocks: ProtectedBlock[], filePath: string, contentType?: ContentType): MacroGroup {
    if (!node.content) {
        throw new Error("#group needs content.")
    }

    const groupNodes = splitMacroAndText(node.content)

    const macroGroup: MacroGroup = {
        type: "group",
        macros: []
    }

    const maybeIntro = groupNodes[0]
    if (maybeIntro && "rawText" in maybeIntro) {
        const intro = groupNodes.shift()
        if (intro && "rawText" in intro) {
            macroGroup.intro = parseRawText(intro, protectedBlocks)
        }
    }

    assertOnlyMacroBlocks(groupNodes)

    if (groupNodes.length === 0) {
        throw new Error("#group needs at least 1 task macro")
    }

    macroGroup.macros = groupNodes.flatMap((node) => {
        const result = parseMacro(node, protectedBlocks, filePath, contentType)
        if (result.type === "group") return result.macros
        return [result]
    })

    return macroGroup
}

function parseSlideSplitContent(node: RawMacroBlock, protectedBlocks: ProtectedBlock[], filePath: string, contentType?: ContentType): SlideSplitMacro {
    const content = node.content ?? "";
    const parts = content.split(/\n---\n/);
    const [leftRaw = "", rightRaw = ""] = parts.map(s => s.trim());
    return {
        type: "slideSplit",
        left:  parseMacroList(leftRaw, protectedBlocks, filePath, contentType),
        right: parseMacroList(rightRaw, protectedBlocks, filePath, contentType),
    };
}

function parseSlideMainContent(node: RawMacroBlock, protectedBlocks: ProtectedBlock[], filePath: string, contentType?: ContentType): SlideMainMacro {
    const content = node.content ?? "";
    const parts = content.split(/\n---\n/);
    const [mainRaw = "", asideRaw = ""] = parts.map(s => s.trim());
    return {
        type: "slideMain",
        main:  parseMacroList(mainRaw, protectedBlocks, filePath, contentType),
        aside: parseMacroList(asideRaw, protectedBlocks, filePath, contentType),
    };
}

function parseStepsContent(node: RawMacroBlock, protectedBlocks: ProtectedBlock[], filePath: string): StepsMacro {
    const content = node.content ?? "";
    const items = content.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
    return {
        type: "steps",
        items: items.map(item => parseRawText({ rawText: item }, protectedBlocks)),
    };
}


// ─── Internal Helper ──────────────────────────────────────────────────────────

function parseMacroList(content: string, protectedBlocks: ProtectedBlock[], filePath: string, contentType?: ContentType): Macro[] {
    const nodes = splitMacroAndText(content);
    return nodes.flatMap((node): Macro[] => {
        if ("rawText" in node) return [];  // ignore stray text between macros
        if (isLayoutMacro(node.type)) {
            const result = parseLayoutMacro(node, protectedBlocks, filePath, contentType);
            if (result.type === "group") return (result as MacroGroup).macros;
            return [result as Macro];
        }
        const result = parseMacro(node, protectedBlocks, filePath, contentType);
        return [result];
    });
}


// ─── Standard Macro Parser ────────────────────────────────────────────────────

export function parseMacro(node: RawMacroBlock, protectedBlocks: ProtectedBlock[], filePath: string, contentType?: ContentType): Macro {
    if (isLayoutMacro(node.type)) {
        throw new Error(`#${node.type} cannot be used inside another macro`)
    }

    const macro: RawMacro = { type: node.type, filePath, protectedBlocks };

    if (node.content) {
        const { inlineMacros, content } = extractInlineMacros(node.content);

        if (Object.keys(inlineMacros).length > 0) {
            macro.inlineMacros = inlineMacros;
        }

        macro.content = content;
    }

    if (node.params) {
        const params = parseParams(node.params);

        if (Object.keys(params).length > 0) {
            macro.params = params;
        }
    }

    return parseMacroType(macro, contentType) as Macro;
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractInlineMacros(src: string): { inlineMacros: InlineMacros, content: RawText } {
    const inlineNodes = splitMacroAndText(src)
    const textParts: string[] = []
    const inlineMacros: InlineMacros = {}

    for (const node of inlineNodes) {
        if ("rawText" in node) {
            // Collect all text segments — text may appear before, between, or after inline macros
            textParts.push(node.rawText)
        } else {
            // Skip Typst-only layout functions (e.g. #h(2em), #v(1em)) that have params but no content block
            if (node.params || node.content == null) continue
            inlineMacros[node.type] = { rawText: node.content }
        }
    }

    const content: RawText = { rawText: textParts.join("\n").trim() }
    return { inlineMacros, content }
}

function assertOnlyMacroBlocks(nodes: RawNode[]): asserts nodes is RawMacroBlock[] {
    if (nodes.some(n => "rawText" in n)) {
        throw new Error("Text is only allowed before macros inside a macro")
    }
}
