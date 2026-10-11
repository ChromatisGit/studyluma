import { expect, test } from "bun:test";
import { fill, plural } from "./text";

test("fill replaces known placeholders and keeps unknown ones", () => {
  expect(fill("Stunde {lesson}, Frame {frame}", { lesson: 1 })).toBe(
    "Stunde 1, Frame {frame}",
  );
});

test("plural picks the form by count", () => {
  const forms = { one: "{count} Aufgabe", other: "{count} Aufgaben" };
  expect(plural(forms, 1)).toBe("1 Aufgabe");
  expect(plural(forms, 3)).toBe("3 Aufgaben");
});
