import { describe, expect, test } from "bun:test";
import { MathEditor } from "./editor";
import type { MathRow } from "./mathNodes";

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
