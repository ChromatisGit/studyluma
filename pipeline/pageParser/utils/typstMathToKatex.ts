import { protectCodeBlocks, restoreCodeBlocks } from "../codeBlockGuard";

const MATH_BLOCK_REGEX = /\$\$([\s\S]+?)\$\$/g;
const MATH_INLINE_REGEX = /\$([^$\n]+?)\$/g;

const SIMPLE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\barrow\.r\b/g, "\\to"],
  [/\barrow\.l\b/g, "\\leftarrow"],
  [/\barrow\.u\b/g, "\\uparrow"],
  [/\barrow\.d\b/g, "\\downarrow"],
  [/\beq\.not\b/g, "\\neq"],
  [/\bin\.not\b/g, "\\notin"],
  [/\binfinity\b/g, "\\infty"],
  [/\bin\b/g, "\\in"],
  [/\bNN\b/g, "\\mathbb{N}"],
  [/\bZZ\b/g, "\\mathbb{Z}"],
  [/\bQQ\b/g, "\\mathbb{Q}"],
  [/\bRR\b/g, "\\mathbb{R}"],
  [/\bCC\b/g, "\\mathbb{C}"],
  [/\bpi\b/g, "\\pi"],
  [/\bdots\b/g, "\\dots"],
  [/\bdot\b/g, "\\cdot"],
  [/\bquad\b/g, "\\quad"],
  [/<=>(?=\s|$)/g, "\\Leftrightarrow "],
  [/=>(?=\s|$)/g, "\\Rightarrow "],
  [/->(?=\s|$)/g, "\\to "],
  [/<=/g, "\\le "],
  [/>=/g, "\\ge "],
  [/!=/g, "\\neq "],
];

export function translateTypstMathToKatex(math: string): string {
  let out = math;

  // Typst string literals inside math -> KaTeX text nodes
  out = out.replace(/"([^"]*)"/g, (_match, text: string) => `\\text{${text}}`);

  // sqrt(x) -> \sqrt{x}
  out = out.replace(/\bsqrt\(([^()]+)\)/g, (_match, inner: string) => `\\sqrt{${inner.trim()}}`);

  // Typst grouping parens in superscript/subscript -> KaTeX curly braces
  // Must run before fraction conversion so ^(1/2) -> ^{1/2} -> ^{\frac{1}{2}}
  out = out.replace(/\^(\(([^()]*)\))/g, (_m, _full, inner: string) => `^{${inner}}`);
  out = out.replace(/_(\(([^()]*)\))/g, (_m, _full, inner: string) => `_{${inner}}`);

  // Typst fraction a/b -> \frac{a}{b} (numeric atoms only)
  out = out.replace(/(\d+)\/(\d+)/g, (_match, num: string, den: string) => `\\frac{${num}}{${den}}`);

  for (const [pattern, replacement] of SIMPLE_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }

  // Typst line breaks in math become TeX line breaks
  out = out.replace(/\\(\r?\n)/g, "\\\\$1");

  return out;
}

export function translateTypstMathInMarkdown(markdown: string): string {
  const { protectedContent, protectedBlocks } = protectCodeBlocks(markdown);

  const translated = protectedContent
    .replace(MATH_BLOCK_REGEX, (_match, math: string) => `$$${translateTypstMathToKatex(math)}$$`)
    .replace(MATH_INLINE_REGEX, (_match, math: string) => `$${translateTypstMathToKatex(math)}$`);

  return restoreCodeBlocks({ rawText: translated }, protectedBlocks).rawText;
}
