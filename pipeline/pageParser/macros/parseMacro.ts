import { Markdown } from "@schema/page";
import { RawText } from "@pipeline/types";
import { ProtectedBlock } from "@pipeline/pageParser/codeBlockGuard";
import { Macro, parseMacroType } from "./macroRegistry";
import { Params, parseParams } from "./parseParams";
import { parseRawText } from "./parseRawText";
import { RawMacroBlock, RawNode, splitMacroAndText } from "./splitMacroAndText";

export type RawMacro = {
    type: string,
    protectedBlocks: ProtectedBlock[],
    params?: Params,
    inlineMacros?: InlineMacros
    content?: RawText,
}

type MacroGroup = {
    type: "group",
    intro?: Markdown
    macros: Macro[]
}

type InlineMacros = Record<string, RawText>

export function parseGroupMacro(node: RawMacroBlock, protectedBlocks: ProtectedBlock[]): MacroGroup {
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
        //ToDo improve error message
        throw new Error("#group needs at least 1 task macro")
    }

    macroGroup.macros = groupNodes.map((node) => {
        return parseMacro(node, protectedBlocks)
    })

    return macroGroup
}

export function parseMacro(node: RawMacroBlock, protectedBlocks: ProtectedBlock[]): Macro {
    if(node.type === "group") {
        throw new Error("#group cannot be used inside another macro")
    }

    const macro: RawMacro = { type: node.type, protectedBlocks };

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

    return parseMacroType(macro);
}


function extractInlineMacros(src: string): { inlineMacros: InlineMacros, content: RawText } {
    const inlineNodes = splitMacroAndText(src)
    let content: RawText = { rawText: "" };

    const firstNode = inlineNodes[0]
    if (firstNode && "rawText" in firstNode) {
        const textNode = inlineNodes.shift()
        if (textNode && "rawText" in textNode) {
            content = textNode
        }
    }

    assertOnlyMacroBlocks(inlineNodes)

    if (inlineNodes.some((node) => node.params)) {
        //ToDo improve error message
        throw new Error("Inline macros cannot have any parameter")
    }

    const inlineMacros: InlineMacros = {};

    inlineNodes.forEach((node) => {
        if (node.content == null) {
            throw new Error("Inline macros must include content.")
        }
        inlineMacros[node.type] = {
            rawText: node.content
        }
    })

    return { inlineMacros, content }
}

function assertOnlyMacroBlocks(nodes: RawNode[]): asserts nodes is RawMacroBlock[] {
    if (nodes.some(n => "rawText" in n)) {
        throw new Error("Text is only allowed before macros inside a macro")
    }
}



