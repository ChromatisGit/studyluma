import { defineMacro } from "@pipeline/pageParser/macros/parserUtils";
import type { ComponentMacro } from "./types";

export const parser = defineMacro({
  type: "component",
  parser: (node): ComponentMacro => {
    const name = node.params?._positional;
    if (typeof name !== "string" || !name) {
      throw new Error('#component requires a name, e.g. #component("passwordBruteForce")');
    }
    return { type: "component", name };
  },
});
