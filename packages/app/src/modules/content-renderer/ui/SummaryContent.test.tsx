import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SummaryContent, type StructuredSummary } from "./SummaryContent";

const card = (id: string) => ({
  id,
  title: id,
  anchor: id,
  rule: [],
  examples: [],
});

describe("SummaryContent", () => {
  test("consecutive cards form one group, a lone card stays single", () => {
    const summary: StructuredSummary = {
      title: "Zusammenfassung",
      content: [
        { type: "merkkarte", id: "a" },
        { type: "merkkarte", id: "b" },
        {
          type: "content",
          content: [
            { type: "paragraph", children: [{ type: "text", value: "Text" }] },
          ],
        },
        { type: "merkkarte", id: "c" },
      ],
      merkkarten: [card("a"), card("b"), card("c")],
    };
    const html = renderToStaticMarkup(<SummaryContent summary={summary} />);
    expect(html.match(/merkkarten-gruppe/g)?.length).toBe(1);
    expect(html.match(/merkkarte__title/g)?.length).toBe(3);
    expect(html.indexOf('id="c"')).toBeGreaterThan(
      html.indexOf("</div></div>"),
    );
  });

  test("an example outside a Merkkarte is a closed accordion", () => {
    const summary: StructuredSummary = {
      title: "Zusammenfassung",
      content: [
        {
          type: "example",
          content: [
            {
              type: "paragraph",
              children: [{ type: "text", value: "Rechnung" }],
            },
          ],
        },
      ],
      merkkarten: [],
    };
    const html = renderToStaticMarkup(<SummaryContent summary={summary} />);
    expect(html).toContain('class="beispiel__toggle"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Beispiel zeigen");
    expect(html).toMatch(/class="beispiel__panel"[^>]*hidden/);
    expect(html).toContain("Rechnung");
  });

  test("derivation steps put the operations in their own column", () => {
    const part = (source: string) => ({
      source,
      display: `<math>${source}</math>`,
    });
    const summary: StructuredSummary = {
      title: "Zusammenfassung",
      content: [
        {
          type: "content",
          content: [
            {
              type: "derivation",
              steps: [
                { equation: part("5x = 2x + 6"), operation: part("-2x") },
                { equation: part("3x = 6") },
              ],
            },
          ],
        },
      ],
      merkkarten: [],
    };
    const html = renderToStaticMarkup(<SummaryContent summary={summary} />);
    expect(html.match(/derivation__equation/g)).toHaveLength(2);
    expect(html.match(/derivation__operation/g)).toHaveLength(1);
    expect(html).toContain("<math>-2x</math>");
  });
});
