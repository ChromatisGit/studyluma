import { renderToString } from "kern-typ";
import { prepareTypstMath } from "../domain/typstMath";

/** German decimal comma inside numbers: 7.5 → 7,5. */
function germanDecimals(mathml: string): string {
  return mathml.replace(
    /<mn>([^<]+)<\/mn>/g,
    (_, value: string) => `<mn>${value.replace(/(\d)\.(\d)/g, "$1,$2")}</mn>`,
  );
}

const TRAILING = /\s*(=|<=|>=|<|>|≤|≥|≈)\s*$/;
const RELATION: Record<string, string> = {
  "<=": "≤",
  ">=": "≥",
  "<": "&lt;",
  ">": "&gt;",
};

function render(source: string, displayMode: boolean): string {
  return renderToString(prepareTypstMath(source), {
    output: "mathml",
    displayMode,
  });
}

/**
 * Typst math as MathML. A formula may end in a relation, as labels do
 * ("f'(x) ="); kern-typ rejects that, so the relation is added afterwards.
 */
export function renderMathML(
  source: string,
  displayMode: boolean,
): string | null {
  try {
    const trailing = TRAILING.exec(source);
    if (!trailing) {
      return germanDecimals(render(source, displayMode));
    }
    const relation = trailing[1] ?? "=";
    const head = render(source.slice(0, trailing.index), displayMode);
    const mo = `<mo>${RELATION[relation] ?? relation}</mo>`;
    return germanDecimals(head.replace(/<\/math>$/, `${mo}</math>`));
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
