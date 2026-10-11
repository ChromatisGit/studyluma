import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { exportedFile } from "./exports";

const packageRoot = resolve(import.meta.dir, "..");

describe("exportedFile", () => {
  test("resolves exact exports and star patterns of this package", () => {
    expect(exportedFile(packageRoot, "@studyluma/app/app/root")).toBe(
      "./app/root.tsx",
    );
    expect(exportedFile(packageRoot, "@studyluma/app/app/routes/login")).toBe(
      "./app/routes/login.tsx",
    );
    expect(exportedFile(packageRoot, "@studyluma/app/app/routes/asset")).toBe(
      "./app/routes/asset.ts",
    );
  });

  test("is undefined for what the package does not export", () => {
    expect(
      exportedFile(packageRoot, "@studyluma/app/app/routes/nope"),
    ).toBeUndefined();
    expect(exportedFile(packageRoot, "@other/pkg/x")).toBeUndefined();
  });
});
