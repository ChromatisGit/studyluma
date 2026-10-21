import { describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CHECK_POINTS, typstToRow } from "@studyluma/catalog-contract";
import { constantValue, finitePoints } from "../src/constant";
import { gridLines, graphicSchema, parseGraphic } from "../src/graphic";
import { compileContent } from "../src/compile";
import { CHAPTER, makeContent as make } from "./fixture";

function edit(root: string, path: string, change: (source: string) => string) {
  const file = join(root, CHAPTER, path);
  writeFileSync(file, change(readFileSync(file, "utf8")));
}

type Report = { code: string; message: string };

/** Parses a Grafik TOML; errors and warnings are collected. */
function read(toml: string) {
  const errors: Report[] = [];
  const warnings: Report[] = [];
  const spec = parseGraphic(
    toml,
    (code, message) => errors.push({ code, message }),
    (code, message) => warnings.push({ code, message }),
  );
  return { spec, errors, warnings };
}

describe("constantValue", () => {
  test.each([
    ["pi", Math.PI],
    ["π", Math.PI],
    ["pi/2", Math.PI / 2],
    ["-2pi", -2 * Math.PI],
    ["3 pi / 4", (3 * Math.PI) / 4],
    ["3/4 pi", (3 * Math.PI) / 4],
    ["2*pi", 2 * Math.PI],
    ["(1 + 2) pi", 3 * Math.PI],
    ["sqrt(2)", Math.SQRT2],
    ["-sqrt(2)/2", -Math.SQRT2 / 2],
    ["pi^2", Math.PI ** 2],
    ["1,5", 1.5],
    ["0.25", 0.25],
    ["-3", -3],
  ])("%s", (text, expected) => {
    const result = constantValue(text);
    expect(result).toHaveProperty("value");
    expect((result as { value: number }).value).toBeCloseTo(expected, 12);
  });

  test.each([
    "",
    "x",
    "abc",
    "sin(1)",
    "1/0",
    "sqrt(-1)",
    "1 +",
    "1..2",
    "pi/",
  ])("refuses %p", (text) => {
    expect(constantValue(text)).toHaveProperty("problem");
  });

  test("names the offending text", () => {
    expect(constantValue("2 foo")).toEqual({
      problem: 'cannot read "2 foo" as a number ("foo" is unknown)',
    });
  });
});

describe("finitePoints", () => {
  const count = (typst: string) => finitePoints(typstToRow(typst));

  test.each([
    ["2x + 1", CHECK_POINTS.length],
    ["1/x", CHECK_POINTS.length],
    ["x^2 - 4", CHECK_POINTS.length],
    ["sin^2(x) + cos(x)^2", CHECK_POINTS.length],
    ["2 e^x", CHECK_POINTS.length],
    ["sqrt(x)", CHECK_POINTS.filter((x) => x >= 0).length],
    ["ln(x)", CHECK_POINTS.filter((x) => x > 0).length],
    ["sqrt(x - 5)", CHECK_POINTS.filter((x) => x >= 5).length],
    ["sqrt(x - 10)", 1],
    ["sqrt(x - 15)", 0],
    ["ln(x - 20)", 0],
    ["1/(x - 15) * sqrt(x - 15)", 0],
  ])("%s is finite at %p points", (typst, expected) => {
    expect(count(typst)).toBe(expected);
  });

  test.each(["3 + 4", "pi/2", "a x + b", "tan(x)", "sin x", "x +", "x %"])(
    "%s tells nothing (no x or not readable)",
    (typst) => {
      expect(count(typst)).toBeUndefined();
    },
  );
});

describe("Grafik numbers and π", () => {
  test("numbers may be written as expressions", () => {
    const { spec, errors } = read(`
[achsen]
x = ["-2pi", "2 pi"]
y = [-2, 2]

[[punkt]]
position = ["pi/2", 1]

[[parameter]]
name = "a"
von = 0
bis = "2pi"
schritt = "pi/12"
start = "pi/2"
einheit = "pi"
`);
    expect(errors).toEqual([]);
    expect(spec?.axes.x[0]).toBeCloseTo(-2 * Math.PI, 12);
    expect(spec?.axes.x[1]).toBeCloseTo(2 * Math.PI, 12);
    expect(spec?.points[0]?.position[0]).toBeCloseTo(Math.PI / 2, 12);
    expect(spec?.parameters[0]).toMatchObject({ unit: "pi" });
    expect(spec?.parameters[0]?.step).toBeCloseTo(Math.PI / 12, 12);
  });

  test("a start at the end of the slider survives rounding", () => {
    const { errors } = read(`
[[parameter]]
name = "a"
von = 0
bis = "pi/2"
schritt = "pi/12"
start = "6pi/12"
`);
    expect(errors).toEqual([]);
  });

  test("an unreadable text is GRAPHIC_NUMBER and shows the text", () => {
    const { errors } = read(`
[achsen]
x = ["abc", 3]
`);
    expect(errors).toEqual([
      {
        code: "GRAPHIC_NUMBER",
        message:
          'achsen.x[1]: cannot read "abc" as a number ("abc" is unknown)',
      },
    ]);
    const point = read('[[punkt]]\nposition = [1, "1/0"]\n');
    expect(point.errors.map((e) => e.code)).toEqual(["GRAPHIC_NUMBER"]);
    expect(point.errors[0]?.message).toContain('"1/0"');
  });

  test("other types are refused with a hint", () => {
    const { errors } = read("[achsen]\nx = [true, 3]\n");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('a number or a text like "pi/2"');
  });

  test("the validations work on the evaluated numbers", () => {
    expect(read('[achsen]\nx = ["pi", "-pi"]\n').errors[0]?.code).toBe(
      "GRAPHIC_AXES",
    );
    const slider = (von: string, bis: string, schritt: string, start: string) =>
      read(
        `[[parameter]]\nname = "a"\nvon = ${von}\nbis = ${bis}\nschritt = ${schritt}\nstart = ${start}\n`,
      ).errors.map((e) => e.code);
    expect(slider('"pi"', '"pi/2"', "1", "1")).toEqual(["GRAPHIC_PARAMETER"]);
    expect(slider("0", '"pi"', '"-pi/12"', "1")).toEqual(["GRAPHIC_PARAMETER"]);
    expect(slider("0", '"pi"', '"pi/12"', '"2pi"')).toEqual([
      "GRAPHIC_PARAMETER",
    ]);
    expect(slider("0", '"pi"', '"pi/12"', '"pi/2"')).toEqual([]);
  });

  test("einheit only knows pi", () => {
    const { errors } = read(
      '[[parameter]]\nname = "a"\nvon = 0\nbis = 1\nschritt = 1\nstart = 1\neinheit = "grad"\n',
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('must be "pi"');
  });
});

describe("Grafik x-raster", () => {
  test("is part of the axes only when written", () => {
    expect(read("").spec?.axes).toEqual({ x: [-5, 5], y: [-5, 5] });
    const { spec, errors, warnings } = read(
      '[achsen]\nx = [-7, 7]\ny = [-2, 2]\nx-raster = "pi/2"\n',
    );
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(spec?.axes).toEqual({ x: [-7, 7], y: [-2, 2], xGrid: "pi/2" });
  });

  test("pi and pi/4 are allowed", () => {
    expect(read('[achsen]\nx-raster = "pi"\n').spec?.axes.xGrid).toBe("pi");
    expect(
      read('[achsen]\nx = [-3, 3]\nx-raster = "pi/4"\n').spec?.axes.xGrid,
    ).toBe("pi/4");
  });

  test("an unknown value names the allowed ones", () => {
    const { spec, errors } = read('[achsen]\nx-raster = "pi/3"\n');
    expect(spec).toBeUndefined();
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe(
      'achsen.x-raster: must be one of "pi", "pi/2", "pi/4"',
    );
    expect(read("[achsen]\nx-raster = 2\n").errors).toHaveLength(1);
  });

  test("counts the lines in view", () => {
    expect(gridLines([-7, 7], "pi/2")).toBe(9);
    expect(gridLines([-7, 7], "pi")).toBe(5);
    expect(gridLines([0, 2 * Math.PI], "pi/2")).toBe(5);
    expect(gridLines([-1, 1], "pi")).toBe(1);
  });

  test("too few or too many lines is a warning", () => {
    const few = read('[achsen]\nx = [-1, 1]\nx-raster = "pi"\n');
    expect(few.errors).toEqual([]);
    expect(few.spec).toBeDefined();
    expect(few.warnings.map((w) => w.code)).toEqual(["GRAPHIC_RASTER"]);
    expect(few.warnings[0]?.message).toContain('"pi"');
    const many = read('[achsen]\nx = [-7, 7]\nx-raster = "pi/4"\n');
    expect(many.errors).toEqual([]);
    expect(many.warnings.map((w) => w.code)).toEqual(["GRAPHIC_RASTER"]);
  });

  test("an absurd number of lines is an error", () => {
    const { spec, errors } = read(
      '[achsen]\nx = [-50, 50]\nx-raster = "pi/4"\n',
    );
    expect(spec).toBeUndefined();
    expect(errors.map((e) => e.code)).toEqual(["GRAPHIC_AXES"]);
    expect(errors[0]?.message).toContain("at most 40");
  });

  test("the editor schema offers the values and both number forms", () => {
    const json = z.toJSONSchema(graphicSchema, {
      io: "input",
      unrepresentable: "any",
    }) as any;
    expect(json.properties.achsen.properties["x-raster"].enum).toEqual([
      "pi",
      "pi/2",
      "pi/4",
    ]);
    expect(json.properties.parameter.items.properties.von.type).toEqual([
      "number",
      "string",
    ]);
    expect(json.properties.parameter.items.properties.einheit.const).toBe("pi");
  });
});

describe("Grafik in a compile", () => {
  const compileWith = (toml: string) => {
    const root = make({ [`${CHAPTER}/grafiken/g.toml`]: toml });
    edit(
      root,
      "aufgaben/Folgeblatt.md",
      (s) => s + "\n## Auftrag\n\n::grafik [G](../grafiken/g.toml)\n",
    );
    return compileContent(root);
  };

  test("a raster warning is reported with file and does not fail", () => {
    const { diagnostics } = compileWith(
      '[achsen]\nx = [-1, 1]\nx-raster = "pi"\n',
    );
    const warning = diagnostics.find((d) => d.code === "GRAPHIC_RASTER");
    expect(warning?.severity).toBe("warning");
    expect(warning?.message).toContain("g.toml");
  });
});

describe("named functions of a Grafikfolie", () => {
  test("funktion, anzeige and sichtbar", () => {
    const { spec, errors } = read(
      '[[graph]]\nterm = "y = sin(x)"\nfunktion = "f"\n\n[[graph]]\nterm = "y = 2x"\nfunktion = "v"\nanzeige = ""\nsichtbar = false\n\n[[graph]]\nterm = "y = x"\nfunktion = "s"\nanzeige = "f(x) + v(x)"\n',
    );
    expect(errors).toEqual([]);
    expect(spec?.graphs.map((g) => g.label?.source)).toEqual([
      "f(x) = sin(x)",
      "v(x)",
      "s(x) = f(x) + v(x)",
    ]);
    expect(spec?.graphs.map((g) => g.visible)).toEqual([
      undefined,
      false,
      undefined,
    ]);
  });
  test("a graph without funktion has no label and anzeige needs a name", () => {
    expect(
      read('[[graph]]\nterm = "y = x"\n').spec?.graphs[0],
    ).not.toHaveProperty("label");
    expect(
      read('[[graph]]\nterm = "y = x"\nanzeige = "x"\n').errors[0]?.code,
    ).toBe("GRAPHIC_FUNCTION_NAME");
    expect(
      read('[[graph]]\nterm = "y = x"\nfunktion = "fx"\n').errors[0]?.code,
    ).toBe("GRAPHIC_FUNCTION_NAME");
  });
});
