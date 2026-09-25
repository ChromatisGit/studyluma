import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { ValidationError } from "@chromatis/base/errors";
import { parseWebsiteConfig, websiteEnvironment } from "./config";

const source = readFileSync(new URL("./config.toml", import.meta.url), "utf8");

describe("Website configuration", () => {
  test("loads the checked-in TOML for every environment", () => {
    for (const environment of ["local", "test", "production"] as const) {
      const config = parseWebsiteConfig(source, environment);
      expect(config.sessionCookieName).toBe("studyluma-session");
      expect(config.secureCookies).toBe(environment === "production");
      expect(Object.isFrozen(config)).toBe(true);
    }
  });

  test("rejects unknown values", () => {
    expect(() =>
      parseWebsiteConfig(`${source}\n[local]\nextra = true`, "local"),
    ).toThrow(ValidationError);
  });

  test("maps Vite development mode to the framework local environment", () => {
    expect(websiteEnvironment("development")).toBe("local");
    expect(websiteEnvironment(undefined)).toBe("local");
    expect(websiteEnvironment("production")).toBe("production");
  });
});
