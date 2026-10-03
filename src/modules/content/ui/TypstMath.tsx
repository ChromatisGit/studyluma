import { renderToString } from "kern-typ";
import { prepareTypstMath } from "../domain/typstMath";

/** German decimal comma inside numbers: 7.5 → 7,5. */
function germanDecimals(mathml: string): string {
  return mathml.replace(
    /<mn>([^<]+)<\/mn>/g,
    (_, value: string) => `<mn>${value.replace(/(\d)\.(\d)/g, "$1,$2")}</mn>`,
  );
}

export function renderMathML(
  source: string,
  displayMode: boolean,
): string | null {
  try {
    return germanDecimals(
      renderToString(prepareTypstMath(source), {
        output: "mathml",
        displayMode,
      }),
    );
  } catch {
    return null;
  }
}

/** Typst math inside running text. */
export function InlineMath({ math }: { math: string }) {
  const mathml = renderMathML(math, false);
  if (!mathml) {
    return <span className="math math--fallback">{math}</span>;
  }
  return <span className="math" dangerouslySetInnerHTML={{ __html: mathml }} />;
}

/** A formula on its own line, large and centered. */
export function BlockMath({ math }: { math: string }) {
  const mathml = renderMathML(math, true);
  if (!mathml) {
    return <div className="math-block math--fallback">{math}</div>;
  }
  return (
    <div className="math-block" dangerouslySetInnerHTML={{ __html: mathml }} />
  );
}
