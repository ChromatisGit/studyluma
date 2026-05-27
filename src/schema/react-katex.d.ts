declare module "react-katex" {
  import type { ComponentType } from "react";

  export type MathProps = {
    math: string;
    [key: string]: unknown;
  };

  export const InlineMath: ComponentType<MathProps>;
  export const BlockMath: ComponentType<MathProps>;

  const ReactKatex: {
    InlineMath: ComponentType<MathProps>;
    BlockMath: ComponentType<MathProps>;
  };

  export default ReactKatex;
}
