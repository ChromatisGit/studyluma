import { RawMacro } from "@pipeline/pageParser/macros/parseMacro";
import { defineMacro } from "@pipeline/pageParser/macros/macroDefinition";
import { Markdown } from "@schema/page";
import { parseRawText } from "@pipeline/pageParser/macros/parseRawText";

export type NoteMacro = {
    type: "note",
    content: Markdown
}

export const noteMacro = defineMacro({
    type: "note",
    parser
});

function parser(node: RawMacro): NoteMacro {
    if(!node.content) {
        throw new Error("#note requires a [ ... ]")
    }

    return {
        type: "note",
        content: parseRawText(node.content, node.protectedBlocks)
    }
}
