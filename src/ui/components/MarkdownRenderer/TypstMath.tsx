import { useEffect, useState } from "react";
import { sha256Hex } from "./sha256";

type MathProps = {
  math: string;
};

const svgMarkupCache = new Map<string, string>();
const svgMarkupRequestCache = new Map<string, Promise<string>>();

/** Content-addressed asset key for a Typst math span - must match the hash the
 *  studyluma-content publish pipeline computes for the same (trimmed) source,
 *  see pipeline/math/resolveMathAsset.ts. Uses a hand-rolled sha256 (not
 *  node:crypto/Web Crypto) so it runs identically in SSR and in the browser
 *  (GapMarkdownRenderer renders this client-side). */
function mathAssetUrl(math: string): string {
  const hash = sha256Hex(math.trim());
  return `/content-assets/${hash}.svg`;
}

function isNeutralDarkColor(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === "#000" || normalized === "#000000" || normalized === "black") {
    return true;
  }

  const hexMatch = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (!hex) {
      return false;
    }

    const rgb =
      hex.length === 3
        ? hex.split("").map((digit) => Number.parseInt(`${digit}${digit}`, 16))
        : [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));

    if (rgb.length !== 3) {
      return false;
    }

    const [r, g, b] = rgb as [number, number, number];
    return Math.max(r, g, b) <= 80 && Math.max(r, g, b) - Math.min(r, g, b) <= 12;
  }

  const rgbMatch = normalized.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+\s*)?\)$/
  );
  if (rgbMatch) {
    const rgb = rgbMatch.slice(1, 4).map(Number);
    if (rgb.length !== 3) {
      return false;
    }

    const [r, g, b] = rgb as [number, number, number];
    return Math.max(r, g, b) <= 80 && Math.max(r, g, b) - Math.min(r, g, b) <= 12;
  }

  return false;
}

function rewriteStyleValue(styleValue: string): string {
  return styleValue.replace(
    /(fill|stroke)\s*:\s*([^;]+)/gi,
    (fullMatch, property: string, color: string) =>
      isNeutralDarkColor(color) ? `${property}: currentColor` : fullMatch
  );
}

function rewriteSvgForTheme(svgMarkup: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svg = doc.documentElement;

  if (!svg || svg.tagName.toLowerCase() !== "svg") {
    return svgMarkup;
  }

  svg.setAttribute("class", [svg.getAttribute("class"), "typst-math-svg"].filter(Boolean).join(" "));
  svg.setAttribute("focusable", "false");
  svg.setAttribute("aria-hidden", "true");
  svg.style.color = "inherit";

  for (const element of Array.from(doc.querySelectorAll<SVGElement>("[fill],[stroke],[style]"))) {
    const fill = element.getAttribute("fill");
    if (fill && isNeutralDarkColor(fill)) {
      element.setAttribute("fill", "currentColor");
    }

    const stroke = element.getAttribute("stroke");
    if (stroke && isNeutralDarkColor(stroke)) {
      element.setAttribute("stroke", "currentColor");
    }

    const style = element.getAttribute("style");
    if (style) {
      element.setAttribute("style", rewriteStyleValue(style));
    }
  }

  return svg.outerHTML;
}

async function loadInlineSvgMarkup(url: string): Promise<string> {
  const cachedMarkup = svgMarkupCache.get(url);
  if (cachedMarkup) {
    return cachedMarkup;
  }

  const pendingRequest = svgMarkupRequestCache.get(url);
  if (pendingRequest) {
    return pendingRequest;
  }

  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load math SVG: ${response.status}`);
      }
      const svgMarkup = rewriteSvgForTheme(await response.text());
      svgMarkupCache.set(url, svgMarkup);
      return svgMarkup;
    })
    .finally(() => {
      svgMarkupRequestCache.delete(url);
    });

  svgMarkupRequestCache.set(url, request);
  return request;
}

function MathSvg({ math, className }: MathProps & { className: string }) {
  const assetUrl = mathAssetUrl(math);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(() => svgMarkupCache.get(assetUrl) ?? null);

  useEffect(() => {
    let cancelled = false;

    void loadInlineSvgMarkup(assetUrl)
      .then((markup) => {
        if (!cancelled) {
          setSvgMarkup(markup);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSvgMarkup(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assetUrl]);

  if (svgMarkup) {
    return (
      <span
        data-testid="typst-math"
        className={className}
        role="img"
        aria-label={math}
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    );
  }

  return <img data-testid="typst-math" className={className} src={assetUrl} alt={math} />;
}

export function InlineMath({ math }: MathProps) {
  return <MathSvg math={math} className="math-inline" />;
}

export function BlockMath({ math }: MathProps) {
  return (
    <div className="math-block">
      <MathSvg math={math} className="math-block-svg" />
    </div>
  );
}
