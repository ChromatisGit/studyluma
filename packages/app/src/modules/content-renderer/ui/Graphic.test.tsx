import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Graphic } from "./Graphic";
import type { Graphic as GraphicSpec } from "../domain/rich";

const slider = {
  name: "a",
  from: 0,
  to: 2 * Math.PI,
  step: Math.PI / 12,
  start: (3 * Math.PI) / 4,
};

const spec = (overrides: Partial<GraphicSpec> = {}): GraphicSpec => ({
  axes: { x: [-7, 7], y: [-2, 2] },
  graphs: [],
  points: [],
  parameters: [],
  ...overrides,
});

const render = (graphic: GraphicSpec) =>
  renderToStaticMarkup(<Graphic graphic={graphic} title="Sinus" />);

describe("Graphic", () => {
  test("renders the text as caption and label", () => {
    const html = render(spec());
    expect(html).toContain("<figcaption");
    expect(html).toContain('aria-label="Sinus"');
    expect(html).not.toContain("<input");
  });

  test("without text there is no caption and the label is generated", () => {
    const html = renderToStaticMarkup(
      <Graphic
        graphic={spec({
          graphs: [{ source: "y = sin(x) + a * x", row: [] as never }],
          parameters: [{ name: "a", from: -1, to: 1, step: 0.1, start: 0 }],
        })}
        title=""
      />,
    );
    expect(html).not.toContain("<figcaption");
    expect(html).toContain(
      'aria-label="Graph von y = sin(x) + a * x, a von -1 bis 1"',
    );
  });

  test("a slider with unit pi shows and announces a multiple of π", () => {
    const html = render(
      spec({
        axes: { x: [-7, 7], y: [-2, 2], xGrid: "pi/2" },
        parameters: [{ ...slider, unit: "pi" }],
      }),
    );
    expect(html).toContain("<output>3π/4</output>");
    expect(html).toContain('aria-valuetext="3 π durch 4"');
  });

  test("a start with float noise is shown and announced as 0", () => {
    const html = render(
      spec({
        axes: { x: [-7, 7], y: [-2, 2], xGrid: "pi/2" },
        parameters: [{ ...slider, start: -2e-16, unit: "pi" }],
      }),
    );
    expect(html).toContain("<output>0</output>");
    expect(html).toContain('aria-valuetext="0"');
    expect(html).toContain('value="0"');
  });

  test("a fraction with the stroke is spoken as durch", () => {
    const html = render(
      spec({ parameters: [{ ...slider, start: Math.PI / 12, unit: "pi" }] }),
    );
    expect(html).toContain("<output>π/12</output>");
    expect(html).toContain('aria-valuetext="π durch 12"');
  });

  test("a slider without a unit stays numeric", () => {
    const html = render(spec({ parameters: [slider] }));
    expect(html).toContain("<output>2,3562</output>");
    expect(html).not.toContain("aria-valuetext");
  });
});
