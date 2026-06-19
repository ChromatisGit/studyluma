import { sha256Hex } from "./sha256";

type MathProps = {
  math: string;
};

/** Content-addressed asset key for a Typst math span - must match the hash the
 *  studyluma-content publish pipeline computes for the same (trimmed) source,
 *  see pipeline/math/resolveMathAsset.ts. Uses a hand-rolled sha256 (not
 *  node:crypto/Web Crypto) so it runs identically in SSR and in the browser
 *  (GapMarkdownRenderer renders this client-side). */
function mathAssetUrl(math: string): string {
  const hash = sha256Hex(math.trim());
  return `/content-assets/${hash}.svg`;
}

export function InlineMath({ math }: MathProps) {
  return (
    <img
      data-testid="typst-math"
      className="math-inline"
      src={mathAssetUrl(math)}
      alt={math}
    />
  );
}

export function BlockMath({ math }: MathProps) {
  return (
    <div className="math-block">
      <img data-testid="typst-math" src={mathAssetUrl(math)} alt={math} />
    </div>
  );
}
