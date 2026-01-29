import { RawMacro } from "@pipeline/pageParser/macros/parseMacro";
import { defineMacro } from "@pipeline/pageParser/macros/macroDefinition";
import { Markdown } from "@schema/page";
import { parseRawText } from "@pipeline/pageParser/macros/parseRawText";

export type MathTaskMacro = {
    type: "mathTask",
    instruction: Markdown;
    hint: Markdown;
    solution: Markdown;
};

export const mathTaskMacro = defineMacro({
    type: "mathTask",
    parser,
    inline: {
        hint: "required",
        solution: "required"
    }
});

function parser(node: RawMacro): MathTaskMacro {
    if (!node.content) {
        throw new Error("#mathTask requires an instruction.")
    }

    return {
        type: "mathTask",
        instruction: parseRawText(node.content, node.protectedBlocks),
        hint: parseRawText(node.inlineMacros!.hint, node.protectedBlocks),
        solution: parseRawText(node.inlineMacros!.solution, node.protectedBlocks)
    }
}
