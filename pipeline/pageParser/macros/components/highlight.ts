import { RawMacro } from "../parseMacro";
import { defineMacro } from "../macroDefinition";
import { Markdown } from "@schema/page";
import { parseRawText } from "../parseRawText";

export type HighlightMacro = {
    type: "highlight",
    icon: "info" | "warning"
    content: Markdown
}

export const highlightMacro = defineMacro({
    type: "highlight",
    parser,
    params: {
        icon: "info"
    }
});

function parser(node: RawMacro): HighlightMacro {
    const params = node.params as {
        icon: "info" | "warning";
    };

    if(!node.content) {
        throw new Error("#highlight requires a [ ... ]")
    }

    return {
        type: "highlight",
        icon: params.icon,
        content: parseRawText(node.content, node.protectedBlocks)
    }
}
