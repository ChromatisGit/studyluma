import type { Macro } from "@macros/registry";

export type SlideSplitMacro = {
  type: "slideSplit";
  left: Macro[];
  right: Macro[];
};
