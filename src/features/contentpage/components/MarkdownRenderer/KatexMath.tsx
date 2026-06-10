import katex from "katex";

type MathProps = {
  math: string;
};

const MACROS = {
  "\\norm": "\\left\\|#1\\right\\|",
  "\\segvec": "\\overrightarrow{#1#2}",
  "\\vect": "\\begin{pmatrix}#1\\\\#2\\\\#3\\end{pmatrix}",
  "\\vectthree": "\\begin{pmatrix}#1\\\\#2\\\\#3\\end{pmatrix}",
  "\\vecttwo": "\\begin{pmatrix}#1\\\\#2\\end{pmatrix}",
} as const;

function renderMath(math: string, displayMode: boolean): string {
  return katex.renderToString(math, {
    displayMode,
    macros: MACROS,
    throwOnError: false,
  });
}

export function InlineMath({ math }: MathProps) {
  return (
    <span
      data-testid="react-katex"
      dangerouslySetInnerHTML={{ __html: renderMath(math, false) }}
    />
  );
}

export function BlockMath({ math }: MathProps) {
  return (
    <div
      data-testid="react-katex"
      dangerouslySetInnerHTML={{ __html: renderMath(math, true) }}
    />
  );
}
