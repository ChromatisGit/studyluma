import { readFileSync } from "fs";
import { defineMacro } from "@pipeline/pageParser/macros/parserUtils";
import { resolveAndCopyContentImage } from "@pipeline/io";
import { imageSize } from "image-size";
import type { ImageMacro } from "./types";

export const parser = defineMacro({
  type: "image",
  parser: (node): ImageMacro => {
    const params = node.params as {
      file?: string;
      _positional?: string;
    };

    const filePath = params.file ?? params._positional;
    if (!filePath) {
      throw new Error("#image requires a file parameter");
    }

    const { publicUrl, absolutePath } = resolveAndCopyContentImage(filePath, node.filePath);
    const buffer = readFileSync(absolutePath);
    const dimensions = imageSize(buffer);

    return {
      type: "image",
      source: publicUrl,
      width: dimensions.width ?? 0,
      height: dimensions.height ?? 0,
      size: "L",
    };
  },
  params: {
    file: "",
  },
});

export const imageParser = parser;
