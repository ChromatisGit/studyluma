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
});
