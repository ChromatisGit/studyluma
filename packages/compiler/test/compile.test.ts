import { describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  CATALOG_FORMAT_VERSION,
  checkCatalogCompatibility,
  validateCatalogArtifact,
  type CatalogArtifactMeta,
} from "@studyluma/catalog-contract";
import compilerPackage from "../package.json" with { type: "json" };
import { CompileFailure, compileContent, writeBuild } from "../src/compile";

import { CHAPTER, makeContent as make } from "./fixture";
const fixture = make();
function edit(root: string, path: string, change: (source: string) => string) {
  const file = join(root, CHAPTER, path);
  writeFileSync(file, change(readFileSync(file, "utf8")));
}
function codes(root: string) {
  try {
    compileContent(root);
    return [];
  } catch (e) {
    if (e instanceof CompileFailure) return e.diagnostics.map((x) => x.code);
    throw e;
  }
}
type Sheet = ReturnType<typeof compileContent>["bundle"]["worksheets"][number];
type TaskPartLike = {
  type: string;
  content: { type: string }[];
  answers?: { exact?: string; checkRow?: unknown[] }[];
};
const tasksOf = (sheet: Sheet) =>
  sheet.sections.flatMap((s) =>
    s.items.flatMap((i) => (i.type === "task" ? [i.task] : [])),
  );

const blank = '+++\ntitel = "Blatt"\n+++\n\n# "Abschnitt"\n\nText.\n';

describe("compiler (new authoring syntax)", () => {
  test("the representative fixture compiles", () => {
    const { bundle } = compileContent(fixture);
    expect(bundle.summaries[0]!.merkkarten[0]!.anchor).toBe(
      "steigung-bestimmen",
    );
    const sheet = bundle.worksheets.find((w) => w.filename === "Steigung")!;
    expect(sheet.sections.map((s) => s.title)).toEqual([
      "Grundlagen",
      "Selbsttest",
    ]);
    expect(sheet.sections.map((s) => s.checkpoint)).toEqual([false, true]);
    expect(sheet.nextWorksheetId).toBe(
      bundle.worksheets.find((w) => w.filename === "Folgeblatt")!.id,
    );
    expect(
      bundle.worksheets.find((w) => w.filename === "Folgeblatt")!.chooseMode,
    ).toBe(false);
  });
  test("topics, courses and the timetable come from thema.toml, kurse/ and definitions.toml", () => {
    const { bundle } = compileContent(fixture);
    expect(bundle.topics).toHaveLength(1);
    expect(bundle.topics[0]).toMatchObject({
      group: "math",
      folder: "lineare-funktionen",
      title: "Lineare Funktionen",
      icon: { gallery: "gerade" },
    });
    expect(bundle.chapters[0]!.title).toBe("Lineare Funktionen");
    expect(bundle.courses).toEqual([
      {
        id: "mathe",
        title: "Mathematik",
        topics: [
          {
            topicId: bundle.topics[0]!.id,
            chapterIds: [bundle.chapters[0]!.id],
          },
        ],
      },
    ]);
    expect(bundle.timetable.periods).toEqual([
      { number: 1, start: 480, end: 525 },
      { number: 2, start: 530, end: 575 },
    ]);
  });
  test("a course's aktuell names the chapter it is at and must be one of its chapters", () => {
    const at = compileContent(
      make({
        "math/lineare-funktionen/07-neu/inhalt.md": '# "x"\n',
        "kurse/mathe.toml":
          'titel = "X"\naktuell = "lineare-funktionen/07-neu"\n\n[themen]\nlineare-funktionen = ["kapitel-a", "07-neu"]\n',
      }),
    ).bundle;
    const neu = at.chapters.find((c) => c.slug === "neu")!;
    expect(at.courses[0]!.currentChapterId).toBe(neu.id);
    expect(
      codes(
        make({
          "kurse/mathe.toml":
            'titel = "X"\naktuell = "lineare-funktionen/fehlt"\n\n[themen]\nlineare-funktionen = ["kapitel-a"]\n',
        }),
      ),
    ).toContain("COURSE_CHAPTER");
  });
  test("chapters and worksheets get URL names without their number prefix", () => {
    const { bundle } = compileContent(fixture);
    expect(bundle.chapters[0]!.slug).toBe("kapitel-a");
    expect(bundle.worksheets.find((w) => w.filename === "Steigung")!.slug).toBe(
      "steigung",
    );
    const root = make({
      "math/lineare-funktionen/07-neu/inhalt.md": '# "x"\n',
      "math/lineare-funktionen/07-neu/aufgaben/03-blatt.md": blank,
      "kurse/mathe.toml":
        'titel = "X"\n\n[themen]\nlineare-funktionen = ["kapitel-a", "07-neu"]\n',
    });
    const numbered = compileContent(root).bundle;
    expect(numbered.chapters.map((c) => c.slug).sort()).toEqual([
      "kapitel-a",
      "neu",
    ]);
    expect(numbered.worksheets.map((w) => w.slug)).toContain("blatt");
  });
  test("URL names must be unique: per chapter for worksheets, per course for chapters", () => {
    const sheets = make({
      [`${CHAPTER}/aufgaben/01-Steigung.md`]: blank,
    });
    expect(codes(sheets)).toContain("SLUG_DUPLICATE");
    const chapters = make({
      "math/lineare-funktionen/02-kapitel-a/inhalt.md": '# "x"\n',
      "kurse/mathe.toml":
        'titel = "X"\n\n[themen]\nlineare-funktionen = ["kapitel-a", "02-kapitel-a"]\n',
    });
    expect(codes(chapters)).toContain("SLUG_DUPLICATE");
  });
  test("topic icon.svg becomes an asset; metadata errors are reported", () => {
    const root = make({
      "math/lineare-funktionen/icon.svg":
        '<svg xmlns="http://www.w3.org/2000/svg"/>',
    });
    expect(codes(root)).toContain("TOPIC_ICON");
    writeFileSync(
      join(root, "math/lineare-funktionen/thema.toml"),
      'titel = "Lineare Funktionen"\n',
    );
    expect(compileContent(root).bundle.topics[0]!.icon).toHaveProperty(
      "assetId",
    );
    rmSync(join(root, "math/lineare-funktionen/thema.toml"));
    expect(codes(root)).toContain("TOPIC_MISSING");
    const other = make({
      "kurse/mathe.toml":
        'titel = "X"\n\n[themen]\nunbekannt = ["a"]\nlineare-funktionen = ["fehlt"]\n',
      "definitions.toml": 'stundenplan = ["09:00-08:00"]\n',
    });
    expect(codes(other)).toEqual(
      expect.arrayContaining(["COURSE_TOPIC", "COURSE_CHAPTER", "TIMETABLE"]),
    );
    const dup = make({
      "andere/lineare-funktionen/thema.toml": 'titel = "Doppelt"\n',
      "andere/lineare-funktionen/kap/inhalt.md": '# "x"\n',
    });
    expect(codes(dup)).toContain("TOPIC_DUPLICATE");
  });
  test("expands repeated Baustein placements without duplicating source entities", () => {
    const { bundle } = compileContent(fixture);
    const root = bundle.foliensaetze.find((x) => x.filename === "Stunde")!;
    const presentation = bundle.presentations.find(
      (x) => x.rootFoliensatzId === root.id,
    )!;
    expect(presentation.placements.length).toBe(6);
    expect(new Set(presentation.placements.map((x) => x.id)).size).toBe(6);
    expect(presentation.placements[1]!.sourceEntryId).toBe(
      presentation.placements[4]!.sourceEntryId,
    );
    expect(presentation.placements[1]!.id).not.toBe(
      presentation.placements[4]!.id,
    );
    expect(presentation.placements[3]!.kind).toBe("summary");
    expect("segments" in presentation.placements[1]!).toBe(false);
    expect(presentation.placements[0]!.title).toBe("Einstieg");
  });
  test("groups keep content, parts and lettering order", () => {
    const sheet = compileContent(fixture).bundle.worksheets.find(
      (w) => w.filename === "Steigung",
    )!;
    const group = tasksOf(sheet)[0]!;
    expect(group.title).toBe("Gerade untersuchen");
    expect(group.items.map((x) => x.type)).toEqual([
      "content",
      "part",
      "content",
      "part",
    ]);
    const parts = group.items.flatMap((x) =>
      x.type === "part" ? [x.part] : [],
    );
    expect(parts.map((p) => p.type)).toEqual(["Einsetzen", "Antwort"]);
    expect(parts[0]!.title).toBeUndefined();
    expect(parts[1]!.title).toBe("Steigung berechnen");
    expect(parts[1]!.answer?.checkRow).toBeDefined();
  });
  test("unnamed tasks need neither titles nor unique titles", () => {
    const sheet = compileContent(fixture).bundle.worksheets.find(
      (w) => w.filename === "Steigung",
    )!;
    const [group, auswahl, auftrag] = tasksOf(sheet);
    expect(group!.title).toBe("Gerade untersuchen");
    expect(auswahl!.title).toBeUndefined();
    expect(auftrag!.title).toBeUndefined();
    const root = make();
    edit(
      root,
      "aufgaben/Folgeblatt.md",
      (s) =>
        s +
        '\n## Antwort\n\nBerechne $1 + 1$.\n\n::antwort\n2\n\n## Antwort: "Eins"\n\nA $1$\n\n::antwort\n1\n',
    );
    expect(codes(root)).toEqual([]);
    edit(
      root,
      "aufgaben/Folgeblatt.md",
      (s) => s + '\n## Antwort: "Eins"\n\nA $1$\n\n::antwort\n1\n',
    );
    expect(codes(root)).toContain("TASK_DUPLICATE");
  });
  test("::mehrfach is an explicit flag and may precede the prompt", () => {
    const sheet = compileContent(fixture).bundle.worksheets.find(
      (w) => w.filename === "Steigung",
    )!;
    const part = tasksOf(sheet)[1]!.items[0]!;
    if (part.type !== "part") throw new Error("part expected");
    expect(part.part.multiple).toBe(true);
    expect(part.part.options).toHaveLength(3);
    expect(JSON.stringify(part.part.content)).toContain(
      "Welche Aussagen stimmen?",
    );
    const quiz = compileContent(fixture).bundle.quizzes[0]!;
    expect(quiz.questions.map((q) => q.multiple)).toEqual([false, true]);
    const root = make();
    edit(root, "aufgaben/Steigung.md", (s) => s.replace("::mehrfach\n\n", ""));
    expect(codes(root)).toContain("SELECTION_RULE");
  });
  test("::schritte holds the steps of a part, each with a gap", () => {
    const { bundle } = compileContent(fixture);
    const sheet = bundle.worksheets.find((w) => w.filename === "Steigung")!;
    const group = tasksOf(sheet)[0]!;
    const steps = group.items.flatMap((x) =>
      x.type === "part" && x.part.steps ? [x.part.steps] : [],
    )[0]!;
    expect(steps.items).toHaveLength(2);
    expect(group).not.toHaveProperty("struktur");
    const challenge = bundle.challengePools[0]!.challenges[1]!;
    expect(challenge.items.some((x) => x.type === "part" && x.part.steps)).toBe(
      true,
    );
    const root = make();
    edit(root, "aufgaben/Steigung.md", (s) =>
      s.replace("- Quotient bilden: ((2))", "- Quotient bilden"),
    );
    expect(codes(root)).toContain("STEPS_NO_GAP");
    edit(root, "aufgaben/Steigung.md", (s) =>
      s.replace(
        "::schritte\n- Differenzen bestimmen: ((4)) und ((2))\n- Quotient bilden",
        "::schritte\n1. Differenzen\n2. Quotient",
      ),
    );
    expect(codes(root)).toContain("STEPS_FORMAT");
    edit(root, "aufgaben/Steigung.md", (s) =>
      s.replace("::schritte\n1. Differenzen\n2. Quotient", "::schritte 2\n"),
    );
    expect(codes(root)).toContain("STEPS_FORMAT");
    edit(root, "aufgaben/Steigung.md", (s) =>
      s.replace("::schritte 2\n", "::schritte\n"),
    );
    expect(codes(root)).toContain("STEPS_EMPTY");
  });
  test("solution sets and vectors are recognised in answers", () => {
    const root = make();
    edit(
      root,
      "aufgaben/Folgeblatt.md",
      (s) =>
        s +
        "\n## Antwort\n\nLöse.\n\n::antwort\nL = {-4; 1/2 ~ 0.5}\n" +
        "\n## Antwort\n\nKeine Lösung.\n\n::antwort\n{}\n" +
        "\n## Antwort\n\nVektor.\n\n::antwort\nvec(1; (2, 3))\n",
    );
    const sheet = compileContent(root).bundle.worksheets.find(
      (w) => w.filename === "Folgeblatt",
    )!;
    const answers = tasksOf(sheet).flatMap((t) =>
      t.items.flatMap((i) =>
        i.type === "part" && i.part.answer ? [i.part.answer] : [],
      ),
    );
    const [set, none, vector] = answers.slice(1);
    expect(set).toMatchObject({
      kind: "set",
      label: "L",
      exact: "{-4; 1/2 ~ 0.5}",
    });
    expect(set?.elements?.map((e) => e.exact)).toEqual(["-4", "1/2"]);
    expect(set?.elements?.[1]).toMatchObject({ rounded: "0.5", decimals: 1 });
    expect(none).toMatchObject({ kind: "set", elements: [] });
    expect(vector?.kind).toBe("vector");
    expect(vector?.elements).toHaveLength(2);
  });
  test("answers may use the decimal comma", () => {
    const root = make();
    edit(root, "aufgaben/Steigung.md", (s) =>
      s.replace(
        "Die Steigung ist ((2)).",
        "Die Steigung ist ((0,5 ~ 0,5)), ((1/3 ~ 0,33)).",
      ),
    );
    edit(
      root,
      "aufgaben/Folgeblatt.md",
      (s) =>
        s +
        "\n## Antwort\n\nLöse.\n\n::antwort\nx = 2,5\n" +
        "\n## Antwort\n\nMenge.\n\n::antwort\nL = {-4; 1/2 ~ 0,5}\n",
    );
    const { bundle } = compileContent(root);
    const answers = (name: string) =>
      tasksOf(bundle.worksheets.find((w) => w.filename === name)!).flatMap(
        (t) =>
          t.items.flatMap((i) => {
            if (i.type !== "part") return [];
            const gaps = i.part.content.flatMap((n) =>
              n.type === "paragraph"
                ? n.children.flatMap((c) => (c.type === "gap" ? [c] : []))
                : [],
            );
            return [...gaps.map((g) => g.answer), i.part.answer];
          }),
      );
    const all = [...answers("Steigung"), ...answers("Folgeblatt")].filter(
      (a) => a !== undefined,
    );
    expect(all.find((a) => a.exact === "0.5")).toMatchObject({
      rounded: "0.5",
      decimals: 1,
    });
    expect(all.find((a) => a.exact === "1/3")).toMatchObject({
      rounded: "0.33",
      decimals: 2,
    });
    expect(all.find((a) => a.exact === "2.5")).toMatchObject({ label: "x" });
    const set = all.find((a) => a.kind === "set" && a.elements?.length === 2);
    expect(set?.elements?.[1]).toMatchObject({ rounded: "0.5", decimals: 1 });
  });
  test("::fehler answers drop a label like ::antwort does", () => {
    const root = make();
    edit(
      root,
      "aufgaben/Folgeblatt.md",
      (s) =>
        s +
        "\n## Antwort\n\nLöse.\n\n::antwort\nx = 4\n\n::fehler\n" +
        "x = 3: Hinweis eins\nx = -7/3: Hinweis zwei\n5: Ohne Label\n" +
        "f(x) = 2x: Mit Funktion\nx = 1: Mit: Doppelpunkt\n",
    );
    const part = compileContent(root)
      .bundle.worksheets.find((w) => w.filename === "Folgeblatt")!
      .sections.flatMap((x) => x.items)
      .flatMap((x) => (x.type === "task" ? x.task.items : []))
      .flatMap((x) => (x.type === "part" ? [x.part] : []))
      .find((p) => p.markers.fehler);
    expect(part?.answer).toMatchObject({ exact: "4", label: "x" });
    expect(part?.markers.fehler).toEqual([
      { answer: "3", feedback: "Hinweis eins" },
      { answer: "-7/3", feedback: "Hinweis zwei" },
      { answer: "5", feedback: "Ohne Label" },
      { answer: "2x", feedback: "Mit Funktion" },
      { answer: "1", feedback: "Mit: Doppelpunkt" },
    ]);
  });
  test("a term that is defined at too few comparison points is warned about", () => {
    const warned = (answer: string) => {
      const root = make();
      edit(
        root,
        "aufgaben/Folgeblatt.md",
        (s) => s + `\n## Antwort\n\nGib an.\n\n::antwort\n${answer}\n`,
      );
      return compileContent(root)
        .diagnostics.filter((d) => d.code === "ANSWER_DOMAIN")
        .map((d) => d.message);
    };
    for (const answer of ["sqrt(x - 15)", "f(x) = ln(x - 20)", "sqrt(x - 10)"])
      expect(warned(answer)).toHaveLength(1);
    expect(warned("sqrt(x - 15)")[0]).toContain("sqrt(x - 15)");
    // Enough points, a constant, a number, a set and a word are fine.
    for (const answer of [
      "sqrt(x - 5)",
      "ln(x)",
      "2x + 1",
      "sqrt(2)",
      "4",
      "{1; 5}",
      "Parabel",
    ])
      expect(warned(answer)).toEqual([]);
  });
  test("sets and vectors are separated by semicolons, not commas", () => {
    const root = make();
    const write = (answer: string) =>
      edit(
        root,
        "aufgaben/Folgeblatt.md",
        (s) => s + `\n## Antwort\n\nLöse.\n\n::antwort\n${answer}\n`,
      );
    write("L = {1; 2,5; 3}");
    const set = compileContent(root)
      .bundle.worksheets.find((w) => w.filename === "Folgeblatt")!
      .sections.flatMap((x) => x.items)
      .flatMap((x) => (x.type === "task" ? x.task.items : []))
      .flatMap((x) =>
        x.type === "part" && x.part.answer ? [x.part.answer] : [],
      )
      .find((a) => a.kind === "set");
    expect(set?.elements?.map((e) => e.exact)).toEqual(["1", "2.5", "3"]);
    for (const wrong of ["{1, 2, 3}", "{1,2,3}", "vec(1, 2)"]) {
      const bad = make();
      edit(
        bad,
        "aufgaben/Folgeblatt.md",
        (s) => s + `\n## Antwort\n\nLöse.\n\n::antwort\n${wrong}\n`,
      );
      expect(codes(bad)).toEqual(["ANSWER_SEPARATOR"]);
    }
  });
  test("a solution set or vector is not allowed in a gap", () => {
    const root = make();
    edit(root, "aufgaben/Steigung.md", (s) =>
      s.replace("Die Steigung ist ((2)).", "Die Menge ist (({1, 2}))."),
    );
    expect(codes(root)).toContain("GAP_ANSWER_KIND");
    edit(root, "aufgaben/Steigung.md", (s) =>
      s.replace("(({1, 2}))", "((vec(1)))"),
    );
    expect(codes(root)).toContain("ANSWER_VECTOR");
  });
  describe("Grafiken", () => {
    const sheetOf = (root: string) =>
      compileContent(root).bundle.worksheets.find(
        (w) => w.filename === "Folgeblatt",
      )!;
    const withGraphic = (toml: string, body: string) => {
      const root = make({ [`${CHAPTER}/grafiken/g.toml`]: toml });
      edit(root, "aufgaben/Folgeblatt.md", (s) => s + body);
      return root;
    };
    test("::grafik embeds the compiled spec in the content", () => {
      const root = withGraphic(
        `[achsen]
x = [-3, 3]
y = [-10, 10]

[[graph]]
term = "y = x^n"

[[graph]]
term = "y = 2x + 3"
name = "g"

[[punkt]]
position = [1, 2]

[[punkt]]
position = [3, 6]
name = "B"

[[parameter]]
name = "n"
von = 1
bis = 8
schritt = 1
start = 2
`,
        "\n## Auftrag\n\nSchau hin.\n\n::grafik [Exponent](../grafiken/g.toml)\n",
      );
      const part = tasksOf(sheetOf(root)).at(-1)!.items[0]!;
      const node = (part as { part: TaskPartLike }).part.content.find(
        (n) => n.type === "graphic",
      ) as any;
      expect(node.title).toBe("Exponent");
      expect(node.graphic.axes).toEqual({ x: [-3, 3], y: [-10, 10] });
      expect(node.graphic.graphs.map((g: any) => [g.source, g.name])).toEqual([
        ["x^n", undefined],
        ["2x + 3", "g"],
      ]);
      expect(node.graphic.points[1]).toEqual({ position: [3, 6], name: "B" });
      expect(node.graphic.parameters[0]).toEqual({
        name: "n",
        from: 1,
        to: 8,
        step: 1,
        start: 2,
      });
    });
    test("a Graph task keeps its answers in order", () => {
      const root = withGraphic(
        `[achsen]
x = [-2, 6]
y = [-2, 8]

[eingabe]
typ = "funktion"
anzahl = 2
`,
        "\n## Graph\n\nGib zwei Geraden an.\n\n::grafik [Fläche](../grafiken/g.toml)\n\n::antwort\ny = 2x + 1\ny = -x + 4\n",
      );
      const part = (
        tasksOf(sheetOf(root)).at(-1)!.items[0] as { part: TaskPartLike }
      ).part;
      expect(part.type).toBe("Graph");
      expect(part.answers?.map((a) => a.exact)).toEqual(["2x + 1", "-x + 4"]);
      expect(part.answers?.[0]?.checkRow?.length).toBeGreaterThan(0);
    });
    test("a Graph answer may use the decimal comma", () => {
      const root = withGraphic(
        `[achsen]
x = [-2, 6]
y = [-2, 8]

[eingabe]
typ = "funktion"
anzahl = 1
`,
        "\n## Graph\n\nGib eine Gerade an.\n\n::grafik [Fläche](../grafiken/g.toml)\n\n::antwort\ny = 0,5x + 1,5\n",
      );
      const part = (
        tasksOf(sheetOf(root)).at(-1)!.items[0] as { part: TaskPartLike }
      ).part;
      expect(part.answers?.map((a) => a.exact)).toEqual(["0.5x + 1.5"]);
    });
    test("::beispiel outside a Merkkarte is an example of its own", () => {
      const root = make();
      edit(
        root,
        "inhalt.md",
        (s) =>
          s +
          '\n## "Gleichungen"\n\nText davor.\n\n::beispiel\n$3x = 6$\n\n::beispiel\n$x = 2$\n\n---\n\nText danach.\n',
      );
      const content = compileContent(root).bundle.summaries[0]!.content;
      expect(content.map((x) => x.type)).toEqual([
        "content",
        "merkkarte",
        "content",
        "example",
        "example",
        "content",
      ]);
      const after = content.at(-1) as { content: { type: string }[] };
      expect(JSON.stringify(after)).toContain("Text danach");
      edit(root, "inhalt.md", (s) => s + "\n::beispiel\n");
      expect(codes(root)).toContain("EXAMPLE_EMPTY");
    });
    test("a heading ends an example", () => {
      const root = make();
      edit(
        root,
        "inhalt.md",
        (s) => s + '\n::beispiel\n$x = 1$\n\n## "Weiter"\n\nText.\n',
      );
      const content = compileContent(root).bundle.summaries[0]!.content;
      expect(content.slice(-3).map((x) => x.type)).toEqual([
        "content",
        "example",
        "content",
      ]);
      expect(JSON.stringify(content.at(-1))).toContain("Weiter");
    });
    test("formula lines with | operations become one aligned derivation", () => {
      const root = make();
      edit(
        root,
        "inhalt.md",
        (s) =>
          s +
          "\n$0,5 x + 2 = x + 1,5 | *2$\n$|x + 3| = 5 | -5$\n$x = 5$\n\n$a = b | +1$\n\nText.\n\n$c = d$\n$e = f$\n",
      );
      const { content } = compileContent(root).bundle.summaries[0]!;
      const nodes = content.flatMap((x) =>
        x.type === "content" ? x.content : [],
      );
      const derivations = nodes.filter((x) => x.type === "derivation");
      // A blank line starts a new derivation.
      expect(derivations).toHaveLength(2);
      expect(
        derivations[0]!.steps.map((x) => [
          x.equation.source,
          x.operation?.source,
        ]),
      ).toEqual([
        ["0,5 x + 2 = x + 1,5", "*2"],
        ["|x + 3| = 5", "-5"],
        ["x = 5", undefined],
      ]);
      expect(derivations[0]!.steps[0]!.equation.display).toContain(
        "<mn>0,5</mn>",
      );
      // HTML puts <math> in the MathML namespace; the attribute is dropped.
      expect(derivations[0]!.steps[0]!.equation.display).toStartWith("<math");
      expect(derivations[0]!.steps[0]!.equation.display).not.toContain("xmlns");
      // Formula lines without an operation stay a plain paragraph.
      const plain = nodes.filter(
        (x) => x.type === "paragraph" && JSON.stringify(x).includes('"e = f"'),
      );
      expect(plain).toHaveLength(1);
    });
    test("::grafik works in chapter content, Merkkarten, slides and tips", () => {
      const root = make({
        [`${CHAPTER}/grafiken/g.toml`]: '[[graph]]\nterm = "y = x^2"\n',
      });
      const ref = "::grafik [G](grafiken/g.toml)\n";
      edit(root, "inhalt.md", (s) => s + "\n" + ref);
      edit(root, "inhalt.md", (s) =>
        s.replace(
          "$m = (y_2-y_1)/(x_2-x_1)$.",
          "$m = (y_2-y_1)/(x_2-x_1)$.\n\n" + ref,
        ),
      );
      const { bundle } = compileContent(root);
      const summary = JSON.stringify(bundle.summaries[0]);
      expect(summary.match(/"type":"graphic"/g)).toHaveLength(2);
      edit(root, "folien/Stunde.md", (s) =>
        s.replace(
          "::bis 4:00\n\n::notiz",
          ref.replace("grafiken", "../grafiken") + "\n::bis 4:00\n\n::notiz",
        ),
      );
      const slides = JSON.stringify(compileContent(root).bundle.foliensaetze);
      expect(slides).toContain('"type":"graphic"');
    });
    describe("::grafikfolie", () => {
      const toml =
        '[[graph]]\nterm = "y = sin(x)"\nfunktion = "f"\n\n[[graph]]\nterm = "y = a * x"\nfunktion = "t"\nsichtbar = false\n\n[[parameter]]\nname = "a"\nvon = -1\nbis = 1\nschritt = 0.1\nstart = 0\n';
      const slide = (body: string) => {
        const root = make({ [`${CHAPTER}/grafiken/g.toml`]: toml });
        edit(root, "folien/Stunde.md", (s) =>
          s.replace(
            "# Foliensatz: Baustein\n::bis 8:00",
            `# "Grafik"\n${body}\n\n# Foliensatz: Baustein\n::bis 8:00`,
          ),
        );
        return root;
      };
      test("a slide with only the Grafik keeps its functions", () => {
        const root = slide(
          "::tag Einstieg\n::grafikfolie [](../grafiken/g.toml)",
        );
        const result = compileContent(root);
        expect(
          result.diagnostics.filter((x) => x.severity === "error"),
        ).toEqual([]);
        const entry = result.bundle.foliensaetze
          .find((x) => x.filename === "Stunde")!
          .entries.find((x) => x.title === "Grafik")!;
        expect(entry.segments).toEqual([]);
        const graphs = entry.graphicSlide!.graphic.graphs;
        expect(graphs.map((g) => g.function)).toEqual(["f", "t"]);
        expect(graphs.map((g) => g.visible)).toEqual([undefined, false]);
        expect(graphs[0]!.label!.source).toBe("f(x) = sin(x)");
        expect(graphs[0]!.label!.display).toContain("<math");
        expect(entry.graphicSlide!.title).toBe("");
      });
      test("other content, a second Grafik and a missing path are errors", () => {
        expect(
          codes(slide("::grafikfolie [](../grafiken/g.toml)\nText")),
        ).toContain("GRAPHIC_SLIDE_BODY");
        expect(
          codes(
            slide(
              "::grafikfolie [](../grafiken/g.toml)\n::grafikfolie [](../grafiken/g.toml)",
            ),
          ),
        ).toContain("GRAPHIC_SLIDE_DUPLICATE");
        expect(codes(slide("::grafikfolie ../grafiken/g.toml"))).toContain(
          "GRAPHIC_SYNTAX",
        );
        expect(
          codes(slide("::grafikfolie [](../grafiken/fehlt.toml)")),
        ).toContain("GRAPHIC_MISSING");
      });
    });
    test("reports Grafik problems", () => {
      const graph =
        "\n## Graph\n\nText.\n\n::grafik [G](../grafiken/g.toml)\n\n::antwort\ny = 2x\n";
      expect(
        codes(
          withGraphic(
            '[[graph]]\nterm = "y = x^n"\n',
            "\n## Auftrag\n\n::grafik [G](../grafiken/g.toml)\n",
          ),
        ),
      ).toContain("GRAPHIC_VARIABLE");
      expect(
        codes(
          withGraphic(
            "foo = 1\n",
            "\n## Auftrag\n\n::grafik [G](../grafiken/g.toml)\n",
          ),
        ),
      ).toContain("GRAPHIC_KEY");
      expect(
        codes(
          withGraphic(
            "[achsen]\nx = [5, -5]\ny = [0, 1]\n",
            "\n## Auftrag\n\n::grafik [G](../grafiken/g.toml)\n",
          ),
        ),
      ).toContain("GRAPHIC_AXES");
      expect(
        codes(
          withGraphic(
            '[[graph]]\nterm = "y = x"\n',
            "\n## Auftrag\n\n::grafik [G](../grafiken/fehlt.toml)\n",
          ),
        ),
      ).toContain("GRAPHIC_MISSING");
      expect(
        codes(
          withGraphic(
            '[[graph]]\nterm = "y = x"\n',
            "\n## Auftrag\n\n::grafik G\n",
          ),
        ),
      ).toContain("GRAPHIC_SYNTAX");
      // Graph without eingabe, eingabe outside Graph, wrong answer count, foreign variable
      expect(
        codes(withGraphic('[[graph]]\nterm = "y = x"\n', graph)),
      ).toContain("GRAPH_INPUT");
      expect(
        codes(
          withGraphic(
            '[eingabe]\ntyp = "funktion"\n',
            "\n## Auftrag\n\n::grafik [G](../grafiken/g.toml)\n",
          ),
        ),
      ).toContain("GRAPH_INPUT_CONTEXT");
      expect(
        codes(withGraphic('[eingabe]\ntyp = "funktion"\nanzahl = 2\n', graph)),
      ).toContain("GRAPH_ANSWER_COUNT");
      expect(
        codes(
          withGraphic(
            '[eingabe]\ntyp = "funktion"\n',
            graph.replace("y = 2x", "y = a x"),
          ),
        ),
      ).toContain("ANSWER_VARIABLE");
    });
  });
  test("builds are deterministic and publish content-hashed assets", () => {
    const output = mkdtempSync(join(tmpdir(), "studyluma-build-"));
    const a = writeBuild(fixture, output),
      b = writeBuild(fixture, output);
    expect(a.bundle.buildId).toBe(b.bundle.buildId);
    expect(a.path).toBe(b.path);
    expect(readFileSync(join(a.path, "catalog.json"), "utf8")).toContain(
      `"schemaVersion": ${CATALOG_FORMAT_VERSION}`,
    );
    expect(a.bundle.assets).toHaveLength(1);
    expect(
      readFileSync(join(a.path, a.bundle.assets[0]!.path)).length,
    ).toBeGreaterThan(0);
    expect(compileContent(make()).bundle.buildId).toBe(a.bundle.buildId);
  });
  describe("catalog.meta.json", () => {
    const metaOf = (path: string) =>
      JSON.parse(
        readFileSync(join(path, "catalog.meta.json"), "utf8"),
      ) as CatalogArtifactMeta;
    test("names the format, the build and the compiler, and the artifact validates", () => {
      const output = mkdtempSync(join(tmpdir(), "studyluma-meta-"));
      const build = writeBuild(fixture, output);
      expect(metaOf(build.path)).toEqual({
        formatVersion: CATALOG_FORMAT_VERSION,
        buildId: build.bundle.buildId,
        compiler: {
          name: "@studyluma/compiler",
          version: compilerPackage.version,
        },
      });
      expect(checkCatalogCompatibility(metaOf(build.path))).toEqual({
        ok: true,
      });
      expect(validateCatalogArtifact(build.path)).toEqual({ ok: true });
    });
    test("is byte-identical for identical content, wherever it is built", () => {
      const a = writeBuild(
        fixture,
        mkdtempSync(join(tmpdir(), "studyluma-meta-")),
      );
      const b = writeBuild(
        make(),
        mkdtempSync(join(tmpdir(), "studyluma-meta-")),
      );
      const bytes = (path: string, file: string) =>
        readFileSync(join(path, file), "utf8");
      expect(bytes(b.path, "catalog.meta.json")).toBe(
        bytes(a.path, "catalog.meta.json"),
      );
      expect(bytes(b.path, "catalog.json")).toBe(bytes(a.path, "catalog.json"));
      expect(bytes(a.path, "catalog.meta.json")).not.toMatch(
        /\d{4}-\d{2}-\d{2}/,
      );
    });
    test("is added to an older build of the same content and never overwritten", () => {
      const output = mkdtempSync(join(tmpdir(), "studyluma-meta-"));
      const build = writeBuild(fixture, output);
      rmSync(join(build.path, "catalog.meta.json"));
      writeBuild(fixture, output);
      expect(metaOf(build.path).buildId).toBe(build.bundle.buildId);
      writeFileSync(join(build.path, "catalog.meta.json"), "kept\n");
      writeBuild(fixture, output);
      expect(readFileSync(join(build.path, "catalog.meta.json"), "utf8")).toBe(
        "kept\n",
      );
    });
  });
  test("fill images work in every content type", () => {
    const root = make();
    edit(root, "aufgaben/Folgeblatt.md", (s) =>
      s.replace(
        "Berechne $2 + 2$.",
        "!![Graph](../bild.png)\n\nBerechne $2 + 2$.",
      ),
    );
    edit(root, "inhalt.md", (s) => s + "\n!![Graph](bild.png)\n");
    const { bundle } = compileContent(root);
    const image = JSON.stringify(bundle.worksheets);
    expect(image).toContain('"fit":"cover"');
    expect(JSON.stringify(bundle.summaries)).toContain('"fit":"cover"');
  });
  test("rejects invalid quiz selection", () => {
    const root = make();
    edit(root, "quiz/Steigung erkennen.md", (s) =>
      s.replace("- ( ) $3$", "- (x) $3$"),
    );
    expect(codes(root)).toContain("QUIZ_SELECTION");
  });
  test("rejects missing prerequisite and cycle", () => {
    const root = make();
    edit(root, "challenges.md", (s) => s.replace("- Steigung", "- Fehlend"));
    edit(root, "folien/Baustein.md", (s) => s + "\n# Foliensatz: Stunde\n");
    const found = codes(root);
    expect(found).toContain("REFERENCE_MISSING");
    expect(found).toContain("FOLIENSATZ_CYCLE");
  });
  test("resolves presentation Merkkarte in the outer chapter and checks assets", () => {
    const root = make();
    edit(root, "folien/Baustein.md", (s) =>
      s.replace("Steigung bestimmen", "Fehlend"),
    );
    expect(codes(root)).toContain("MERKKARTE_MISSING");
    edit(
      root,
      "folien/Baustein.md",
      (s) =>
        s.replace("Fehlend", "Steigung bestimmen") +
        '\n# "Bild"\n![bad](../../../../../outside.png)\n',
    );
    expect(codes(root)).toContain("ASSET_ESCAPE");
  });
  test("rejects links with a scheme that runs code", () => {
    const root = make();
    edit(
      root,
      "folien/Baustein.md",
      (s) => s + '\n# "Link"\n[Klick](javascript:alert(1))\n',
    );
    expect(codes(root)).toContain("LINK_SCHEME");
    edit(root, "folien/Baustein.md", (s) =>
      s.replace("javascript:alert(1)", "https://example.org"),
    );
    expect(codes(root)).not.toContain("LINK_SCHEME");
  });
  test("rejects malformed math and missing answers", () => {
    const root = make();
    edit(root, "aufgaben/Steigung.md", (s) =>
      s.replace("m = 2\n\n::schritte", "m = (2\n\n::schritte"),
    );
    expect(codes(root)).toContain("MATH_SYNTAX");
    edit(root, "aufgaben/Folgeblatt.md", (s) => s.replace("::antwort\n4", ""));
    expect(codes(root)).toContain("ANSWER_REQUIRED");
  });
  test("uses source chapter for files, root chapter for local Merkkarten, links for other chapters", () => {
    const root = make({
      "math/anderes/thema.toml": 'titel = "Anderes"\n',
      "math/anderes/zweites/inhalt.md":
        '# "Andere"\n## Merkkarte: "Steigung bestimmen"\nAndere Regel.\n',
      "math/anderes/zweites/folien/Start.md":
        '+++\ntitel = "Andere Stunde"\n+++\n# Foliensatz: [Baustein](../../../lineare-funktionen/kapitel-a/folien/Baustein.md)\n',
    });
    edit(root, "folien/Baustein.md", (s) => s + "\n# Arbeitsblatt: Steigung\n");
    const { bundle } = compileContent(root);
    const start = bundle.foliensaetze.find((x) => x.filename === "Start")!;
    const placement = bundle.presentations.find(
      (x) => x.rootFoliensatzId === start.id,
    )!.placements;
    const card = bundle.summaries.find((x) => x.chapterId === start.chapterId)!
      .merkkarten[0]!;
    expect(placement.find((x) => x.kind === "merkkarte")!.targetId).toBe(
      card.id,
    );
    expect(placement.find((x) => x.kind === "worksheet")!.targetId).toBe(
      bundle.worksheets.find((w) => w.filename === "Steigung")!.id,
    );
  });
  test("Merkkarte links resolve relative to the referencing file", () => {
    const { bundle } = compileContent(fixture);
    const sheet = bundle.worksheets.find((w) => w.filename === "Steigung")!;
    const card = bundle.summaries[0]!.merkkarten[0]!;
    expect(JSON.stringify(sheet)).toContain(
      `"type":"merkkarteRef","targetId":"${card.id}"`,
    );
    const root = make({
      "math/anderes/zweites/folien/Start.md":
        '+++\ntitel = "Start"\n+++\n# Merkkarte: [Steigung](../../../lineare-funktionen/kapitel-a/inhalt.md#steigung-bestimmen)\n',
      "math/anderes/thema.toml": 'titel = "Anderes"\n',
      "math/anderes/zweites/inhalt.md": '# "Andere"\n',
    });
    const result = compileContent(root).bundle;
    const start = result.foliensaetze.find((x) => x.filename === "Start")!;
    expect(
      result.presentations.find((p) => p.rootFoliensatzId === start.id)!
        .placements[0]!.targetId,
    ).toBe(card.id);
    edit(root, "aufgaben/Steigung.md", (s) =>
      s.replace("inhalt.md#steigung-bestimmen", "inhalt.md#gibt-es-nicht"),
    );
    expect(codes(root)).toContain("MERKKARTE_MISSING");
    edit(root, "aufgaben/Steigung.md", (s) =>
      s.replace("../inhalt.md#gibt-es-nicht", "../../anderswo/inhalt.md#x"),
    );
    expect(codes(root)).toContain("CHAPTER_MISSING");
  });
  test("keeps content before and after slide columns, with column titles", () => {
    const root = make();
    edit(root, "folien/Stunde.md", (s) =>
      s.replace(
        "Was fällt euch auf?",
        'Vorher\n## Links: "Lineare Funktion"\nLinks\n## Rechts: "Quadratische"\nRechts\n---\nNachher',
      ),
    );
    const first = compileContent(root).bundle.foliensaetze.find(
      (x) => x.filename === "Stunde",
    )!.entries[0]!;
    expect(first.segments.map((x) => x.type)).toEqual([
      "content",
      "columns",
      "content",
    ]);
    const columns = first.segments[1]!;
    if (columns.type !== "columns") throw new Error("columns expected");
    expect(columns.columns.map((c) => c.title)).toEqual([
      "Lineare Funktion",
      "Quadratische",
    ]);
    expect(columns.columns.map((c) => c.width)).toEqual([0.5, 0.5]);
  });
  test("a lone Mitte column is centred and ends at ---", () => {
    const root = make();
    edit(root, "folien/Stunde.md", (s) =>
      s.replace("Was fällt euch auf?", "## Mitte\nx\n---\nNachher"),
    );
    const first = compileContent(root).bundle.foliensaetze.find(
      (x) => x.filename === "Stunde",
    )!.entries[0]!;
    expect(first.segments.map((x) => x.type)).toEqual(["columns", "content"]);
    const columns = first.segments[0]!;
    if (columns.type !== "columns") throw new Error("columns expected");
    expect(columns.centered).toBe(true);
    expect(columns.columns.map((c) => c.width)).toEqual([1]);
  });
  test("keeps nested inclusion notes on the first placement", () => {
    const root = make();
    edit(root, "folien/Stunde.md", (s) =>
      s.replace(
        "# Foliensatz: Baustein\n::bis 8:00",
        "# Foliensatz: Baustein\n::bis 8:00\n::notiz\nBaustein erläutern",
      ),
    );
    const { bundle } = compileContent(root);
    const presentation = bundle.presentations.find(
      (p) => p.title === "Stunde",
    )!;
    const include = bundle.foliensaetze.find((f) => f.title === "Stunde")!
      .entries[1]!;
    expect(presentation.placements[1]!.noteSourceEntryIds).toEqual([
      include.id,
    ]);
  });
  test("::platz is only allowed on slides", () => {
    const root = make();
    edit(root, "folien/Stunde.md", (s) =>
      s.replace("Was fällt euch auf?", "::platz 2"),
    );
    const first = compileContent(root).bundle.foliensaetze.find(
      (x) => x.filename === "Stunde",
    )!.entries[0]!;
    expect(JSON.stringify(first.segments)).toContain('"type":"space","size":2');
    edit(root, "inhalt.md", (s) =>
      s.replace('# "Lineare Funktionen"', '# "Lineare Funktionen"\n\n::platz'),
    );
    expect(codes(root)).toContain("MARKER_INVALID");
  });
  test("::schreiben was replaced by ::platz", () => {
    const root = make();
    edit(root, "folien/Stunde.md", (s) =>
      s.replace("Was fällt euch auf?", "::schreiben Rechnung"),
    );
    expect(codes(root)).toContain("OBSOLETE_SYNTAX");
  });
  test("::tag sets the tab of a slide", () => {
    const root = make();
    edit(root, "folien/Stunde.md", (s) =>
      s.replace("Was fällt euch auf?", "::tag Aufgabe\nWas fällt euch auf?"),
    );
    const first = compileContent(root).bundle.foliensaetze.find(
      (x) => x.filename === "Stunde",
    )!.entries[0]!;
    expect(first.tag).toBe("Aufgabe");
    const message = (tag: string) => {
      edit(root, "folien/Stunde.md", (s) =>
        s.replace(/::tag [^\n]*/, `::tag ${tag}`),
      );
      try {
        compileContent(root);
        return undefined;
      } catch (e) {
        if (!(e instanceof CompileFailure)) throw e;
        return e.diagnostics.find((d) => d.code === "TAG_SYNTAX")?.message;
      }
    };
    expect(message("Einstieg wichtig")).toContain("write ::tag Einstieg");
    expect(message("Erklären")).toContain("is now ::tag Plenum");
    expect(message("Knobelei hinweis")).toContain("is now ::tag Aufgabe");
    expect(message("Freitext")).toContain("Einstieg|Wiederholung|Plenum");
    expect(message("Austausch")).toBeUndefined();
  });
  test("::merkkarte places a Merkkarte on a slide", () => {
    const root = make();
    edit(root, "folien/Stunde.md", (s) =>
      s.replace(
        "Was fällt euch auf?",
        'Was fällt euch auf?\n\n::merkkarte "Steigung bestimmen"',
      ),
    );
    const { bundle } = compileContent(root);
    const card = bundle.summaries[0]!.merkkarten[0]!;
    expect(
      JSON.stringify(
        bundle.foliensaetze.find((x) => x.filename === "Stunde")!.entries[0]!
          .segments,
      ),
    ).toContain(`"type":"merkkarteCard","targetId":"${card.id}"`);
  });
  test("rejects invalid layout and task-scoped markers", () => {
    const root = make();
    edit(root, "folien/Stunde.md", (s) =>
      s.replace("Was fällt euch auf?", "## Rechts\nOhne linke Spalte"),
    );
    edit(root, "aufgaben/Steigung.md", (s) =>
      s.replace(
        "Die Steigung ist ((2)).",
        "Die Steigung ist ((2)).\n::braucht\n- Steigung",
      ),
    );
    const found = codes(root);
    expect(found).toContain("LAYOUT_INVALID");
    expect(found).toContain("PREREQUISITE_CONTEXT");
  });
  test("Checkpoints accept Einsetzen/Auswahl/Antwort and reject the rest", () => {
    const base = (task: string) =>
      make({
        [`${CHAPTER}/aufgaben/Check.md`]: `+++\ntitel = "Check"\n+++\n# "A"\n\n## Antwort\n\n$1$\n\n::antwort\n1\n\n# Checkpoint\n\n${task}`,
      });
    expect(codes(base("## Einsetzen\n\nEins ist ((1)).\n"))).toEqual([]);
    expect(codes(base("## Auswahl\n\nWas?\n\n- (x) a\n- ( ) b\n"))).toEqual([]);
    expect(codes(base("## Auftrag\n\nSchreibe.\n"))).toContain(
      "CHECKPOINT_TASK",
    );
    expect(
      codes(base("## Antwort\n\n$1$\n\n::antwort\n1\n\n::tipp\nHm\n")),
    ).toContain("CHECKPOINT_MARKER");
    expect(
      codes(
        base("## Antwort\n\n$1$\n\n::antwort\n1\n\n::schritte\n- a: ((1))\n"),
      ),
    ).toContain("CHECKPOINT_MARKER");
    expect(
      codes(base("## Antwort\n\n::optional\n\n$1$\n\n::antwort\n1\n")),
    ).toContain("OPTIONAL_CONTEXT");
  });
  test("a failed build publishes no directory", () => {
    const root = make();
    const output = mkdtempSync(join(tmpdir(), "studyluma-invalid-build-"));
    edit(root, "folien/Stunde.md", (s) =>
      s.replace(
        "# Foliensatz: Baustein\n::bis 8:00",
        "# Quiz: Fehlend\n::bis 8:00",
      ),
    );
    expect(() => writeBuild(root, output)).toThrow(CompileFailure);
    expect(readdirSync(output)).toEqual([]);
  });
  test("nested presentation diagnostics carry the inclusion chain", () => {
    const root = make();
    edit(root, "folien/Baustein.md", (s) =>
      s.replace("Steigung bestimmen", "Unbekannt"),
    );
    try {
      compileContent(root);
      throw new Error("Expected compilation to fail");
    } catch (error) {
      if (!(error instanceof CompileFailure)) throw error;
      const nested = error.diagnostics.find(
        (d) => d.code === "MERKKARTE_MISSING" && d.inclusionChain?.length === 2,
      );
      expect(nested?.inclusionChain).toEqual(
        expect.arrayContaining(["Stunde", "Baustein"]),
      );
    }
  });
  test("repeated gaps on one line get distinct IDs", () => {
    const root = make();
    edit(root, "aufgaben/Steigung.md", (s) =>
      s.replace("Die Steigung ist ((2)).", "((sqrt(2) ~ 1.41)) und ((2))"),
    );
    const sheet = compileContent(root).bundle.worksheets.find(
      (w) => w.filename === "Steigung",
    )!;
    const item = tasksOf(sheet)[0]!.items.find(
      (x) => x.type === "part" && x.part.type === "Einsetzen",
    );
    if (item?.type !== "part") throw new Error("Fixture part missing");
    const gaps = item.part.content.flatMap((n) =>
      n.type === "paragraph" ? n.children.filter((c) => c.type === "gap") : [],
    );
    expect(gaps).toHaveLength(2);
    expect(gaps[0]!.id).not.toBe(gaps[1]!.id);
  });
  test("reports timing mismatches as nonfatal warnings", () => {
    const root = make();
    edit(root, "folien/Baustein.md", (s) => s + "\n::bis 5:00\n");
    expect(() => compileContent(root)).toThrow(); // duplicate ::bis
    const again = make();
    edit(again, "folien/Baustein.md", (s) =>
      s.replace("::bis 4:00", "::bis 3:00"),
    );
    const result = compileContent(again);
    expect(
      result.diagnostics.some(
        (d) => d.code === "TIMING_MISMATCH" && d.severity === "warning",
      ),
    ).toBe(true);
  });
  describe("obsolete syntax is rejected with file and line", () => {
    const cases: [string, string, (s: string) => string, string][] = [
      [
        "unquoted section title",
        "aufgaben/Folgeblatt.md",
        (s) => s.replace('# "Mehr"', "# Mehr"),
        "HEADING_QUOTES",
      ],
      [
        "# Aufgaben",
        "aufgaben/Folgeblatt.md",
        (s) => s.replace('# "Mehr"', "# Aufgaben"),
        "OBSOLETE_SYNTAX",
      ],
      [
        "Lückentext",
        "aufgaben/Folgeblatt.md",
        (s) => s.replace("## Antwort", "## Lückentext"),
        "OBSOLETE_SYNTAX",
      ],
      [
        "Ergebnis",
        "aufgaben/Folgeblatt.md",
        (s) => s.replace("## Antwort", "## Ergebnis"),
        "OBSOLETE_SYNTAX",
      ],
      [
        "unquoted task title",
        "aufgaben/Folgeblatt.md",
        (s) => s.replace("## Antwort", "## Antwort: Titel"),
        "TITLE_QUOTES",
      ],
      [
        "implicit group",
        "aufgaben/Folgeblatt.md",
        (s) => s.replace("## Antwort", "## Titel"),
        "TASK_TYPE",
      ],
      [
        "::struktur",
        "aufgaben/Steigung.md",
        (s) => s.replace("::schritte", "::struktur plan\n::schritte"),
        "OBSOLETE_SYNTAX",
      ],
      [
        "unquoted Merkkarte",
        "inhalt.md",
        (s) =>
          s.replace(
            'Merkkarte: "Steigung bestimmen"',
            "Merkkarte: Steigung bestimmen",
          ),
        "TITLE_QUOTES",
      ],
      [
        "chapter-style link",
        "aufgaben/Steigung.md",
        (s) => s.replace("../inhalt.md#steigung-bestimmen", "thema/kapitel"),
        "OBSOLETE_SYNTAX",
      ],
      [
        "## Frage",
        "quiz/Steigung erkennen.md",
        (s) => s.replace("## Auswahl", "## Frage"),
        "OBSOLETE_SYNTAX",
      ],
      [
        "unquoted quiz title",
        "quiz/Steigung erkennen.md",
        (s) => s.replace('# "Steigung erkennen"', "# Steigung erkennen"),
        "HEADING_QUOTES",
      ],
      [
        "# Folie",
        "folien/Stunde.md",
        (s) => s.replace('# "Einstieg"', "# Folie: Einstieg"),
        "OBSOLETE_SYNTAX",
      ],
      [
        "# Zusammenfassung",
        "folien/Stunde.md",
        (s) => s.replace("# Inhalt", "# Zusammenfassung"),
        "OBSOLETE_SYNTAX",
      ],
      [
        "::bis{}",
        "folien/Stunde.md",
        (s) => s.replace("::bis 4:00", "::bis{4:00}"),
        "OBSOLETE_SYNTAX",
      ],
      [
        "::schreibflaeche",
        "folien/Stunde.md",
        (s) => s.replace("Was fällt euch auf?", "::schreibflaeche"),
        "OBSOLETE_SYNTAX",
      ],
      [
        "path notation",
        "folien/Stunde.md",
        (s) =>
          s.replace(
            "# Foliensatz: Baustein\n::bis 8:00",
            "# Foliensatz: a/b/foliensaetze/Baustein\n::bis 8:00",
          ),
        "OBSOLETE_SYNTAX",
      ],
      [
        "quoted file reference",
        "folien/Stunde.md",
        (s) =>
          s.replace(
            "# Foliensatz: Baustein\n::bis 8:00",
            '# Foliensatz: "Baustein"\n::bis 8:00',
          ),
        "SLIDE_ENTRY",
      ],
      [
        "unquoted Merkkarte reference",
        "folien/Baustein.md",
        (s) => s.replace('"Steigung bestimmen"', "Steigung bestimmen"),
        "SLIDE_ENTRY",
      ],
      [
        "unquoted column title",
        "folien/Stunde.md",
        (s) => s.replace("Was fällt euch auf?", "## Links: A\nx\n## Rechts\ny"),
        "TITLE_QUOTES",
      ],
    ];
    for (const [name, path, change, code] of cases)
      test(name, () => {
        const root = make();
        edit(root, path, change);
        let diagnostics: { code: string; file: string; line: number }[] = [];
        try {
          compileContent(root);
        } catch (e) {
          if (!(e instanceof CompileFailure)) throw e;
          diagnostics = e.diagnostics;
        }
        const hit = diagnostics.find((d) => d.code === code);
        expect(hit).toBeDefined();
        expect(hit!.file.length).toBeGreaterThan(0);
        expect(hit!.line).toBeGreaterThan(0);
      });
    test("renamed folders", () => {
      for (const from of ["worksheets", "quizzes", "foliensaetze"]) {
        const root = make({
          [`${CHAPTER}/${from}/X.md`]: '+++\ntitel = "X"\n+++\n',
        });
        expect(codes(root)).toContain("OBSOLETE_SYNTAX");
      }
      expect(codes(make({ [`${CHAPTER}/summary.md`]: '# "A"\n' }))).toContain(
        "OBSOLETE_SYNTAX",
      );
    });
  });
});

describe("TOML configuration", () => {
  const problems = (root: string) => {
    try {
      compileContent(root);
      return [];
    } catch (e) {
      if (e instanceof CompileFailure) return e.diagnostics;
      throw e;
    }
  };
  const FOLDER = "math/lineare-funktionen";
  const graphic = (toml: string) => {
    const root = make({ [`${CHAPTER}/grafiken/g.toml`]: toml });
    edit(
      root,
      "aufgaben/Folgeblatt.md",
      (s) => s + "\n## Auftrag\n\n::grafik [G](../grafiken/g.toml)\n",
    );
    return problems(root);
  };

  test("syntax errors name the line", () => {
    const root = make({
      [`${FOLDER}/thema.toml`]: 'titel = "A"\nicon = nope\n',
    });
    expect(problems(root)).toContainEqual(
      expect.objectContaining({
        code: "TOML_SYNTAX",
        file: `${FOLDER}/thema.toml`,
        line: 2,
      }),
    );
  });

  test("fields are checked by the schema: required, unknown, wrong type", () => {
    const root = make({
      [`${FOLDER}/thema.toml`]: 'icon = 3\nfarbe = "rot"\n',
    });
    const messages = problems(root).map((d) => d.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        "titel: is required",
        "icon: must be text",
        'unknown key "farbe"',
      ]),
    );
    const course = make({ "kurse/mathe.toml": 'titel = ""\n' });
    expect(problems(course).map((d) => d.message)).toEqual(
      expect.arrayContaining([
        "titel: must not be empty",
        "themen: is required",
      ]),
    );
  });

  test("chapter names must be text, a course needs chapters", () => {
    const root = make({
      "kurse/mathe.toml":
        'titel = "X"\n\n[themen]\nlineare-funktionen = [2024]\n',
    });
    expect(problems(root).map((d) => d.message)).toContain(
      "themen.lineare-funktionen[1]: must be text",
    );
    const empty = make({
      "kurse/mathe.toml": 'titel = "X"\n\n[themen]\nlineare-funktionen = []\n',
    });
    expect(problems(empty).map((d) => d.message)).toContain(
      "themen.lineare-funktionen: must not be empty",
    );
  });

  test("the timetable defaults to no periods and rejects overlaps", () => {
    const none = make({ "definitions.toml": "" });
    expect(compileContent(none).bundle.timetable.periods).toEqual([]);
    const overlap = make({
      "definitions.toml": 'stundenplan = ["08:00-08:45", "08:30-09:15"]\n',
    });
    expect(problems(overlap)).toContainEqual(
      expect.objectContaining({
        code: "TIMETABLE",
        message:
          "stundenplan[2]: must not start before the previous period ends",
      }),
    );
  });

  test("front matter is TOML between +++ lines; --- is reported", () => {
    const wrongType = make();
    edit(wrongType, "aufgaben/Folgeblatt.md", (s) =>
      s.replace("arbeitsweise-wahl = false", 'arbeitsweise-wahl = "nein"'),
    );
    expect(problems(wrongType)).toContainEqual(
      expect.objectContaining({
        code: "FRONT_MATTER",
        message: "arbeitsweise-wahl: must be true or false",
      }),
    );
    const unknown = make();
    edit(unknown, "inhalt.md", (s) =>
      s.replace("titel =", "farbe = 1\ntitel ="),
    );
    expect(codes(unknown)).toContain("FRONT_FIELD");
    const legacy = make();
    edit(legacy, "aufgaben/Folgeblatt.md", (s) =>
      s.replace("+++", "---").replace("+++", "---"),
    );
    expect(codes(legacy)).toContain("OBSOLETE_SYNTAX");
    const syntax = make();
    edit(syntax, "folien/Stunde.md", (s) =>
      s.replace('titel = "Stunde"', "titel = Stunde"),
    );
    expect(problems(syntax)).toContainEqual(
      expect.objectContaining({
        code: "TOML_SYNTAX",
        file: `${CHAPTER}/folien/Stunde.md`,
        line: 2,
      }),
    );
  });

  test("Grafik: defaults, one syntax per list, clear problems", () => {
    const only = make({
      [`${CHAPTER}/grafiken/g.toml`]: '[[graph]]\nterm = "y = x"\n',
    });
    edit(
      only,
      "aufgaben/Folgeblatt.md",
      (s) => s + "\n## Auftrag\n\n::grafik [G](../grafiken/g.toml)\n",
    );
    const sheet = compileContent(only).bundle.worksheets.find(
      (w) => w.filename === "Folgeblatt",
    )!;
    const node = JSON.parse(JSON.stringify(sheet))
      .sections.flatMap((s: any) => s.items)
      .flatMap((i: any) => i.task?.items ?? [])
      .flatMap((i: any) => i.part?.content ?? [])
      .find((n: any) => n.type === "graphic");
    expect(node.graphic.axes).toEqual({ x: [-5, 5], y: [-5, 5] });
    expect(node.graphic.parameters).toEqual([]);

    // the former list names are unknown now
    expect(graphic('graphen = ["y = x"]\n').map((d) => d.code)).toContain(
      "GRAPHIC_KEY",
    );
    expect(graphic('[[graph]]\nterm = "y = "\n').map((d) => d.code)).toContain(
      "GRAPHIC_FUNCTION",
    );
    expect(
      graphic(
        '[[graph]]\nterm = "y = m x"\n\n[[parameter]]\nname = "m"\nvon = 0\nbis = 4\nschritt = 1\nstart = 9\n',
      ).map((d) => d.code),
    ).toContain("GRAPHIC_PARAMETER");
    const twice =
      '[[parameter]]\nname = "m"\nvon = 0\nbis = 4\nschritt = 1\nstart = 1\n\n'.repeat(
        2,
      );
    expect(graphic(twice).map((d) => d.message)).toContainEqual(
      expect.stringContaining('parameter[2].name: "m" is declared twice'),
    );
    expect(graphic("[achsen]\nx = [0\n").map((d) => d.code)).toContain(
      "TOML_SYNTAX",
    );
  });
});
