import { RawMacro } from "../parseMacro";
import { defineMacro } from "../macroDefinition";

export type ImageMacro = {
    type: "image",
    source: string,
    size: "S" | "M" | "L"
}

export const imageMacro = defineMacro({
    type: "image",
    parser,
    params: {
        source: ""
    }
});

function parser(node: RawMacro): ImageMacro {
    const params = node.params as {
        source: string;
    };

    return {
        type: "image",
        source: params.source,
        size: "L"
    }
}
