import { renderToString } from "kern-typ";
import { preprocessTypstMath } from "./preprocessTypstMath";

function applyGermanDecimals(mathml: string): string {
  return mathml.replace(/<mn>([^<]+)<\/mn>/g, (_, n: string) =>
    `<mn>${n.replace(/(\d)\.(\d)/g, "$1,$2")}</mn>`
  );
}

function renderMathML(source: string, displayMode: boolean): string | null {
  try {
    const preprocessed = preprocessTypstMath(source);
    const mathml = renderToString(preprocessed, { output: "mathml", displayMode });
    return applyGermanDecimals(mathml);
  } catch {
    return null;
  }
}

export function InlineMath({ math }: { math: string }) {
  const mathml = renderMathML(math, false);
  if (!mathml) return <span className="math-inline math-fallback">{math}</span>;
  return (
    <span
      data-testid="typst-math"
      className="math-inline"
      dangerouslySetInnerHTML={{ __html: mathml }}
    />
  );
}

export function BlockMath({ math }: { math: string }) {
  const mathml = renderMathML(math, true);
  if (!mathml) return <div className="math-block math-fallback">{math}</div>;
  return (
    <div
      data-testid="typst-math"
      className="math-block"
      dangerouslySetInnerHTML={{ __html: mathml }}
    />
  );
}
