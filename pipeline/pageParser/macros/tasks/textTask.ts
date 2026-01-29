import { RawMacro } from "@pipeline/pageParser/macros/parseMacro";
import { defineMacro } from "@pipeline/pageParser/macros/macroDefinition";
import { Markdown } from "@schema/page";
import { parseRawText } from "@pipeline/pageParser/macros/parseRawText";

export type TextTaskMacro = {
    type: "textTask",
    instruction: Markdown;
    hint: Markdown;
    solution: Markdown;
};

export const textTaskMacro = defineMacro({
    type: "textTask",
    parser,
    inline: {
        hint: "required",
        solution: "required"
    }
});


function parser(node: RawMacro): TextTaskMacro {
    if (!node.content) {
        throw new Error("#textTask requires an instruction.")
    }

    return {
        type: "textTask",
        instruction: parseRawText(node.content, node.protectedBlocks),
        hint: parseRawText(node.inlineMacros!.hint, node.protectedBlocks),
        solution: parseRawText(node.inlineMacros!.solution, node.protectedBlocks)
    }
}
