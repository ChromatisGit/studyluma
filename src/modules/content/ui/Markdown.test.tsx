import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown, SummaryRenderer } from "./Markdown";

describe("Markdown", () => {
  test("a formula alone in its paragraph is a display formula", () => {
    const html = renderToStaticMarkup(
      <Markdown markdown={"Bestimme\n\n$ f(x) = x^2 - x - 6 $"} />,
    );
    expect(html).toContain('class="math-block"');
    expect(html).toContain('display="block"');
  });

  test("inline math in a sentence stays inline", () => {
    const html = renderToStaticMarkup(
      <Markdown markdown={"Für $x = 0$ gilt das."} />,
    );
    expect(html).toContain('class="math"');
    expect(html).not.toContain("math-block");
  });

  test("highlighter marks and unknown directives", () => {
    const html = renderToStaticMarkup(
      <Markdown markdown={"Das ist ==wichtig==. Hinweis:Text"} />,
    );
    expect(html).toContain("<mark>wichtig</mark>");
    expect(html).toContain("Hinweis:Text");
  });

  test("gaps are replaced by the given renderer, also in tables", () => {
    const html = renderToStaticMarkup(
      <Markdown
        markdown={"| $x$ | 1 |\n| --- | --- |\n| $f(x)$ | ￾0￾ |\n\nUnd ￾1￾."}
        renderGap={(index) => <input data-gap={index} />}
      />,
    );
    expect(html).toContain('<table class="table">');
    expect(html).toContain('data-gap="0"');
    expect(html).toContain('data-gap="1"');
  });

  test("inline mode drops the paragraph", () => {
    const html = renderToStaticMarkup(<Markdown inline markdown="$5x^4$" />);
    expect(
      html.startsWith('<span class="md md--inline"><span class="math">'),
    ).toBe(true);
  });
});

describe("SummaryRenderer", () => {
  test("Merkkarten reach to the next marker or heading and group", () => {
    const markdown = [
      "## Regeln",
      "",
      '::merkkarte{#potenzregel title="Potenzregel"}',
      "Für $f(x) = x^n$ gilt $f'(x) = n x^(n-1)$.",
      "",
      "::beispiel",
      "$f(x) = x^3 => f'(x) = 3x^2$",
      "",
      '::merkkarte{#faktorregel title="Faktorregel"}',
      "Ein Faktor bleibt erhalten.",
      "",
      "## Danach",
      "",
      "Normaler Text.",
    ].join("\n");
    const html = renderToStaticMarkup(<SummaryRenderer markdown={markdown} />);
    expect(html).toContain('<h3 class="h3">Regeln</h3>');
    expect(html).toContain('class="merkkarten-gruppe"');
    expect(html).toContain('id="potenzregel"');
    expect(html).toContain("Beispiel zeigen");
    const afterGroup = html.slice(html.indexOf("Danach"));
    expect(afterGroup).toContain("Normaler Text.");
    expect(html.match(/merkkarte__title/g)?.length).toBe(2);
  });
});
