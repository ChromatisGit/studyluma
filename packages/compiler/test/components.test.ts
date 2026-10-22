import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateCatalogArtifact } from "@studyluma/catalog-contract";
import { defineComponent } from "@studyluma/component-api";
import {
  CompileFailure,
  compileContent,
  writeCatalogFiles,
} from "../src/compile";
import { CHAPTER, makeContent } from "./fixture";

/** Uses the Grafik blocks and one key of its own. */
const probe = defineComponent({
  name: "probe",
  version: "2",
  placements: ["text", "folie"],
  keys: ["modus"],
  graphic: true,
  compile(file, context) {
    const graphic = context.graphic(file);
    if (file.modus !== "a" && file.modus !== "b") {
      context.error("PROBE_MODUS", 'modus must be "a" or "b"');
      return undefined;
    }
    if (file.modus === "b") context.warn("PROBE_B", "b is unusual");
    if (file.modus === "a" && context.placement === "folie")
      throw new Error("a cannot fill a slide");
    return (
      graphic && { graphic, modus: file.modus, placement: context.placement }
    );
  },
  description: (props) => `Probe ${props.modus}`,
});
/** Only for the text. */
const inline = defineComponent({
  name: "inline",
  placements: ["text"],
  compile: () => ({}),
  description: () => "Inline",
});
const components = [probe, inline];

const PROBE =
  '[[graph]]\nterm = "y = x^3 - x"\nfunktion = "f"\n\nmodus = "b"\n';

function content(extra: Record<string, string> = {}) {
  return makeContent({
    [`${CHAPTER}/grafiken/p.toml`]: `modus = "b"\n\n${PROBE.replace('\n\nmodus = "b"\n', "\n")}`,
    ...extra,
  });
}
function edit(root: string, path: string, change: (source: string) => string) {
  const file = join(root, CHAPTER, path);
  writeFileSync(file, change(readFileSync(file, "utf8")));
}
const slide = (root: string, body: string) =>
  edit(root, "folien/Stunde.md", (s) =>
    s.replace(
      "# Foliensatz: Baustein\n::bis 8:00",
      `# "Komponente"\n${body}\n\n# Foliensatz: Baustein\n::bis 8:00`,
    ),
  );
function compiled(root: string) {
  return compileContent(root, { components });
}
function codes(root: string) {
  try {
    compiled(root);
    return [];
  } catch (e) {
    if (e instanceof CompileFailure) return e.diagnostics.map((x) => x.code);
    throw e;
  }
}
const inText = (line: string) => {
  const root = content();
  edit(root, "inhalt.md", (s) => `${s}\n${line}\n`);
  return root;
};

describe("::komponente", () => {
  test("embeds the component's props and description in chapter content", () => {
    const result = compiled(inText("::komponente [probe](grafiken/p.toml)"));
    const nodes = result.bundle.summaries[0]!.content.flatMap((item) =>
      item.type === "content" ? item.content : [],
    );
    const node = nodes.find((n) => n.type === "component");
    expect(node).toMatchObject({
      type: "component",
      name: "probe",
      title: "Probe b",
      props: { modus: "b", placement: "text" },
    });
    const graph = (
      node as unknown as {
        props: { graphic: { graphs: { label: { display: string } }[] } };
      }
    ).props.graphic.graphs[0]!;
    expect(graph.label.display).toContain("<math");
    expect(result.components).toEqual([{ name: "probe", version: "2" }]);
  });

  test("works in worksheets, tips and slides", () => {
    const root = content({ [`${CHAPTER}/grafiken/leer.toml`]: "" });
    edit(
      root,
      "aufgaben/Folgeblatt.md",
      (s) =>
        s +
        "\n## Auftrag\n\nSchau hin.\n\n::komponente [probe](../grafiken/p.toml)\n\n::tipp\n::komponente [inline](../grafiken/leer.toml)\n",
    );
    slide(root, "Text.\n\n::komponente [probe](../grafiken/p.toml)");
    const { bundle } = compiled(root);
    const sheet = JSON.stringify(bundle.worksheets);
    expect(sheet).toContain('"name":"probe"');
    expect(sheet).toContain('"name":"inline"');
    expect(JSON.stringify(bundle.foliensaetze)).toContain('"type":"component"');
  });

  test("reports warnings of the component with file and line", () => {
    const result = compiled(inText("::komponente [probe](grafiken/p.toml)"));
    const warning = result.diagnostics.find((d) => d.code === "PROBE_B")!;
    expect(warning.severity).toBe("warning");
    expect(warning.file).toBe(`${CHAPTER}/inhalt.md`);
    expect(warning.line).toBeGreaterThan(1);
    expect(warning.message).toContain("grafiken/p.toml");
  });

  test.each([
    ["::komponente [](grafiken/p.toml)", "COMPONENT_SYNTAX"],
    ["::komponente [Probe](grafiken/p.toml)", "COMPONENT_SYNTAX"],
    ["::komponente grafiken/p.toml", "COMPONENT_SYNTAX"],
    ["::komponente [fehlt](grafiken/p.toml)", "COMPONENT_UNKNOWN"],
    ["::komponente [probe](grafiken/fehlt.toml)", "COMPONENT_MISSING"],
    ["::komponente [probe](grafiken/p.txt)", "COMPONENT_TYPE"],
    ["::komponente [probe](../../../../p.toml)", "COMPONENT_ESCAPE"],
  ])("%s is %s", (line, code) => {
    expect(codes(inText(line))).toContain(code);
  });

  test("checks the keys, the Grafik blocks and the component's own rules", () => {
    const file = (toml: string) => {
      const root = content({ [`${CHAPTER}/grafiken/q.toml`]: toml });
      edit(
        root,
        "inhalt.md",
        (s) => `${s}\n::komponente [probe](grafiken/q.toml)\n`,
      );
      return codes(root);
    };
    expect(file('modus = "b"\nfarbe = "rot"\n')).toContain("COMPONENT_KEY");
    expect(file('modus = "b"\n[eingabe]\ntyp = "funktion"\n')).toContain(
      "COMPONENT_KEY",
    );
    expect(file('modus = "b"\n[[graph]]\nterm = "y = q x"\n')).toContain(
      "GRAPHIC_VARIABLE",
    );
    expect(file('modus = "c"\n')).toContain("PROBE_MODUS");
    expect(file("modus = [")).toContain("TOML_SYNTAX");
    expect(file('modus = "b"\n[[graph]]\nterm = "y = x"\n')).toEqual([]);
  });

  test("a component that throws fails the build with COMPONENT_COMPILE", () => {
    const root = content({ [`${CHAPTER}/grafiken/a.toml`]: 'modus = "a"\n' });
    slide(root, "::komponentenfolie [probe](../grafiken/a.toml)");
    expect(codes(root)).toContain("COMPONENT_COMPILE");
  });

  test("without activated components every use is unknown", () => {
    const root = inText("::komponente [probe](grafiken/p.toml)");
    expect(() => compileContent(root)).toThrow(/activates none/);
  });
});

describe("::komponentenfolie", () => {
  test("a slide that is only the component", () => {
    const root = content();
    slide(
      root,
      "::tag Aufgabe\n::komponentenfolie [probe](../grafiken/p.toml)",
    );
    const entry = compiled(root)
      .bundle.foliensaetze.find((x) => x.filename === "Stunde")!
      .entries.find((x) => x.title === "Komponente")!;
    expect(entry.segments).toEqual([]);
    expect(entry.tag).toBe("Aufgabe");
    expect(entry.componentSlide).toMatchObject({
      name: "probe",
      title: "Probe b",
      props: { placement: "folie" },
    });
  });

  test("other content, a second component, a Grafikfolie and the wrong placement are errors", () => {
    const of = (body: string) => {
      const root = content();
      slide(root, body);
      return codes(root);
    };
    const line = "::komponentenfolie [probe](../grafiken/p.toml)";
    expect(of(`${line}\nText`)).toContain("COMPONENT_SLIDE_BODY");
    expect(of(`${line}\n${line}`)).toContain("COMPONENT_SLIDE_DUPLICATE");
    expect(of(`${line}\n::grafikfolie [](../grafiken/p.toml)`)).toContain(
      "COMPONENT_SLIDE_BODY",
    );
    expect(of("::komponentenfolie [inline](../grafiken/p.toml)")).toContain(
      "COMPONENT_PLACEMENT",
    );
    expect(of("::komponentenfolie ../grafiken/p.toml")).toContain(
      "COMPONENT_SYNTAX",
    );
  });
});

describe("catalog.meta.json", () => {
  test("lists the components the catalog uses, and the artifact validates", () => {
    const result = compiled(inText("::komponente [probe](grafiken/p.toml)"));
    const dir = mkdtempSync(join(tmpdir(), "studyluma-components-"));
    writeCatalogFiles(dir, result);
    expect(
      JSON.parse(readFileSync(join(dir, "catalog.meta.json"), "utf8"))
        .components,
    ).toEqual([{ name: "probe", version: "2" }]);
    expect(validateCatalogArtifact(dir)).toEqual({ ok: true });
  });
});
