import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "..", "..", "..");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sources(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("demo monitoring", () => {
  test("only the worksheet monitoring view imports the scripted figures", () => {
    const users = sources(SRC)
      .filter((file) => !file.endsWith("demoMonitoring.ts"))
      .filter((file) => !file.endsWith("demoMonitoring.isolated.test.ts"))
      .filter((file) => readFileSync(file, "utf8").includes("demoMonitoring"))
      .map((file) => file.slice(SRC.length + 1));
    expect(users).toEqual(["modules/lessons/ui/WorksheetMonitoring.tsx"]);
  });
});
