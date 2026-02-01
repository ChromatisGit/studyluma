import { readFileSync } from "fs";
import { RawMacro } from "@pipeline/pageParser/macros/parseMacro";
import { defineMacro } from "@pipeline/pageParser/macros/macroDefinition";
import { resolveAndCopyContentImage } from "@pipeline/io";
import { imageSize } from "image-size";

export type ImageMacro = {
    type: "image",
    source: string,
    width: number,
    height: number,
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

    if (!params.source) {
        throw new Error("#image requires a source parameter");
    }

    const { publicUrl, absolutePath } = resolveAndCopyContentImage(params.source, node.filePath);
    const buffer = readFileSync(absolutePath);
    const dimensions = imageSize(buffer);

    return {
        type: "image",
        source: publicUrl,
        width: dimensions.width ?? 0,
        height: dimensions.height ?? 0,
        size: "L"
    }
}
