import "./ui/content.css";

export { Markdown, SummaryRenderer } from "./ui/Markdown";
export type { MarkdownProps } from "./ui/Markdown";
export { Merkkarte, MerkkarteBeispiel } from "./ui/Merkkarte";
export type { MerkkarteProps } from "./ui/Merkkarte";
export { InlineMath, BlockMath, renderMathML } from "./ui/TypstMath";
export { CodeBlock } from "./ui/CodeBlock";
export { prepareTypstMath } from "@studyluma/catalog-contract";
export { RichContent, RichInlineContent } from "./ui/RichContent";
export { RichReferenceContext } from "./ui/RichReferenceContext";
export { SummaryContent } from "./ui/SummaryContent";
export type { RichNode, RichInline, Graphic } from "./domain/rich";
export { Graphic as GraphicView } from "./ui/Graphic";
export type { DrawnFunction } from "./ui/Graphic";
export { gapsOf, inputGraphicOf, walkInlines } from "./domain/rich";
export type { GapNode } from "./domain/rich";
export {
  bareFunction,
  callHead,
  decimalPlaces,
  evaluate,
  FUNCTION_NAMES,
  functionAt,
  functionLetters,
  hasDecimal,
  parseRow,
  relativelyEqual,
  tryParse,
  unsimplified,
  unsupportedFunction,
  variablesIn,
} from "./domain/evaluate";
export type { Ast, FunctionName } from "./domain/evaluate";
export {
  boxKeys,
  char,
  childRows,
  cloneRow,
  isBox,
  isMathRow,
  splitTop,
} from "@studyluma/catalog-contract";
export type { MathNode, MathRow } from "@studyluma/catalog-contract";
