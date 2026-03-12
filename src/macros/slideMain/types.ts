import type { Macro } from "@macros/registry";

export type SlideMainMacro = {
  type: "slideMain";
  main: Macro[];
  aside: Macro[];
};
