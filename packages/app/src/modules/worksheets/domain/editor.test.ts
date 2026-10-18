import { describe, expect, test } from "bun:test";
import { MathEditor, speak, type SpeechWords } from "./editor";
import type { MathRow } from "../../content-renderer";

const typed = (keys: string, editor = new MathEditor([])) => {
  for (const key of keys) {
    if (key === "/") {
      editor.frac(true);
    } else if (key === "^") {
      editor.sup();
    } else if (key === ">") {
      editor.right();
    } else if (key === "<") {
      editor.left();
    } else if (key === "#") {
      editor.back();
    } else {
      editor.char(key);
    }
  }
  return editor;
};

const text = (row: MathRow): string =>
  row
    .map((node) => {
      switch (node.t) {
        case "frac":
          return `[${text(node.n)}/${text(node.d)}]`;
        case "sqrt":
          return `√[${text(node.b)}]`;
        case "sup":
          return `^[${text(node.e)}]`;
        default:
          return node.v;
      }
    })
    .join("");

describe("MathEditor", () => {
  test("typed / takes the preceding number as numerator", () => {
    expect(text(typed("3/4").root)).toBe("[3/4]");
  });

  test("arrow right leaves a box like a school calculator", () => {
    expect(text(typed("12x^3>+1").root)).toBe("12x^[3]+1");
  });

  test("pi and sqrt become symbols", () => {
    expect(text(typed("3pi").root)).toBe("3π");
    expect(text(typed("sqrt2>").root)).toBe("√[2]");
  });

  test("backspace in an empty denominator unwraps the numerator", () => {
    const editor = typed("3/");
    editor.back();
    expect(text(editor.root)).toBe("3");
    expect(editor.cursor.i).toBe(1);
  });

  test("backspace removes an empty box", () => {
    const editor = typed("x^");
    editor.back();
    expect(text(editor.root)).toBe("x");
  });

  test("left enters the last box from behind", () => {
    const editor = typed("3/4><");
    expect(editor.cursor.row).toBe((editor.root[0] as { d: MathRow }).d);
  });
});

/** The top-level row with the cursor as "|". */
const shown = (editor: MathEditor) => {
  const parts = editor.root.map((node) => text([node]));
  if (editor.cursor.row === editor.root) {
    parts.splice(editor.cursor.i, 0, "|");
  }
  return parts.join("");
};

const lefts = (editor: MathEditor, count: number) => {
  for (let k = 0; k < count; k++) {
    editor.left();
  }
};

const words: SpeechWords = {
  empty: "leer",
  symbols: { "(": "Klammer auf", ")": "Klammer zu", "−": "minus" },
  fraction: (n, d) => `Bruch ${n} durch ${d}`,
  root: (r) => `Wurzel aus ${r}`,
  squared: "Quadrat",
  power: (e) => `hoch ${e}`,
  functions: { sin: "Sinus", cos: "Kosinus", ln: "natürlicher Logarithmus" },
  of: "von",
};

describe("functions: sin, cos, ln", () => {
  test("the keypad key types name and brackets, cursor between", () => {
    const editor = new MathEditor([]);
    editor.fn("sin");
    expect(shown(editor)).toBe("sin(|)");
    editor.char("x");
    expect(shown(editor)).toBe("sin(x|)");
  });

  test("the key and the keyboard give the same row", () => {
    const keypad = new MathEditor([]);
    keypad.fn("cos");
    keypad.char("x");
    const keyboard = typed("cos(x)");
    expect(keypad.root).toEqual(keyboard.root);
    const ln = new MathEditor([]);
    ln.fn("ln");
    expect(ln.root).toEqual(typed("ln()").root);
  });

  test("the key works inside a box and after a number", () => {
    const editor = typed("2");
    editor.fn("sin");
    editor.char("x");
    expect(shown(editor)).toBe("2sin(x|)");
    const power = typed("x^");
    power.fn("ln");
    expect(text(power.root)).toBe("x^[ln()]");
  });
});

describe("functions: cursor and deleting", () => {
  test("left and right jump over the name", () => {
    const editor = typed("2sin(x)");
    editor.left();
    editor.left();
    expect(shown(editor)).toBe("2sin(|x)");
    editor.left();
    expect(shown(editor)).toBe("2sin|(x)");
    editor.left();
    expect(shown(editor)).toBe("2|sin(x)");
    editor.right();
    expect(shown(editor)).toBe("2sin|(x)");
    editor.right();
    expect(shown(editor)).toBe("2sin(|x)");
  });

  test("letters that are not a call move one by one", () => {
    const editor = typed("sin");
    editor.left();
    expect(shown(editor)).toBe("si|n");
    editor.left();
    editor.left();
    editor.right();
    expect(shown(editor)).toBe("s|in");
  });

  test("an exponent box between name and bracket stays reachable", () => {
    const editor = typed("sin^2>(x)");
    expect(text(editor.root)).toBe("sin^[2](x)");
    lefts(editor, 3);
    expect(shown(editor)).toBe("sin^[2]|(x)");
    // Another step enters the exponent, then leaves it before the box.
    editor.left();
    expect(editor.cursor.row).toBe((editor.root[3] as { e: MathRow }).e);
    lefts(editor, 2);
    expect(shown(editor)).toBe("sin|^[2](x)");
    editor.left();
    expect(shown(editor)).toBe("|sin^[2](x)");
    editor.right();
    expect(shown(editor)).toBe("sin|^[2](x)");
  });
});

describe("functions: deleting", () => {
  test("backspace after the name deletes the whole name", () => {
    const editor = typed("2sin(x)");
    editor.left();
    editor.left();
    editor.left();
    editor.back();
    expect(shown(editor)).toBe("2|(x)");
  });

  test("backspace after a name with an exponent box removes the box too", () => {
    const editor = typed("2sin^2>(x)");
    lefts(editor, 6);
    expect(shown(editor)).toBe("2sin|^[2](x)");
    editor.back();
    expect(shown(editor)).toBe("2|(x)");
    expect(text(editor.root)).toBe("2(x)");
  });

  test("no orphan exponent box is left in a row that has to parse", () => {
    const editor = typed("ln^2>(x)");
    lefts(editor, 6);
    expect(shown(editor)).toBe("ln|^[2](x)");
    editor.back();
    expect(editor.root.some((node) => node.t === "sup")).toBe(false);
  });

  test("backspace after the bracket removes name and both brackets, keeps the argument", () => {
    const editor = typed("1+sin(2x)");
    lefts(editor, 3);
    expect(shown(editor)).toBe("1+sin(|2x)");
    editor.back();
    expect(shown(editor)).toBe("1+|2x");
  });

  test("backspace in an empty call removes the whole call", () => {
    const editor = new MathEditor([]);
    editor.char("2");
    editor.fn("cos");
    editor.back();
    expect(shown(editor)).toBe("2|");
  });

  test("an inner bracket pair does not confuse the matching one", () => {
    const editor = typed("sin(2(x+1))");
    lefts(editor, 7);
    expect(shown(editor)).toBe("sin(|2(x+1))");
    editor.back();
    expect(shown(editor)).toBe("|2(x+1)");
  });

  test("backspace at the end walks the call away piece by piece", () => {
    const editor = typed("sin(x)");
    const steps: string[] = [];
    for (let k = 0; k < 4; k++) {
      editor.back();
      steps.push(shown(editor));
    }
    expect(steps).toEqual(["sin(x|", "sin(|", "|", "|"]);
  });

  test("backspace after the bracket with an exponent removes it too", () => {
    const editor = typed("sin^2>(x)");
    lefts(editor, 2);
    expect(shown(editor)).toBe("sin^[2](|x)");
    editor.back();
    expect(shown(editor)).toBe("|x");
  });

  test("a bracket after a letter that isn't a name keeps plain backspace", () => {
    const editor = typed("s(x)");
    lefts(editor, 2);
    editor.back();
    expect(shown(editor)).toBe("s|x)");
  });
});

describe("functions: clicking and speech", () => {
  test("clicking inside a name puts the cursor at the nearer end", () => {
    const editor = typed("sin(x)");
    editor.place(editor.root, 1);
    expect(editor.cursor.i).toBe(0);
    editor.place(editor.root, 2);
    expect(editor.cursor.i).toBe(3);
    editor.place(editor.root, 4);
    expect(editor.cursor.i).toBe(4);
  });

  test("speech reads a function as 'Sinus von'", () => {
    expect(speak(typed("sin(x)").root, words)).toBe(
      "Sinus von Klammer auf x Klammer zu",
    );
    expect(speak(typed("2ln(x)").root, words)).toBe(
      "2 natürlicher Logarithmus von Klammer auf x Klammer zu",
    );
    expect(speak(typed("cos^2>(x)").root, words)).toBe(
      "Kosinus Quadrat von Klammer auf x Klammer zu",
    );
    expect(speak(typed("sin^3>(x)").root, words)).toBe(
      "Sinus hoch 3 von Klammer auf x Klammer zu",
    );
    // Not a call: the letters are read one by one, as before.
    expect(speak(typed("sin").root, words)).toBe("s i n");
  });
});
