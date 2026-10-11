import { describe, expect, test } from "bun:test";
import shell from "../module";
import { shellConfigSchema, shellLinks } from "./shellConfig";

describe("shell configuration", () => {
  test("an empty file means no extra navigation and no account link", () => {
    expect(shellConfigSchema.parse({})).toEqual({ navigation: [] });
    expect(shell.config?.required).toBe(false);
  });

  test("accepts navigation entries and an account link", () => {
    const config = shellConfigSchema.parse({
      navigation: [
        { label: "Startseite", href: "/" },
        { label: " Roadmap ", href: "/roadmap" },
      ],
      account: { label: "Lehrer", href: "/courses" },
    });
    expect(config.navigation.map((entry) => entry.label)).toEqual([
      "Startseite",
      "Roadmap",
    ]);
    expect(config.account).toEqual({ label: "Lehrer", href: "/courses" });
  });

  test("hrefs must be internal paths and labels must not be empty", () => {
    for (const href of [
      "https://evil.example",
      "//evil.example",
      "roadmap",
      "",
      "/a b",
      "javascript:alert(1)",
    ]) {
      expect(
        shellConfigSchema.safeParse({ navigation: [{ label: "x", href }] })
          .success,
      ).toBe(false);
    }
    expect(
      shellConfigSchema.safeParse({ account: { label: "  ", href: "/" } })
        .success,
    ).toBe(false);
  });

  test("unknown keys are errors", () => {
    expect(shellConfigSchema.safeParse({ nav: [] }).success).toBe(false);
    expect(
      shellConfigSchema.safeParse({
        navigation: [{ label: "x", href: "/", icon: "y" }],
      }).success,
    ).toBe(false);
  });

  test("by default the account slot is the login button and there are no extra entries", () => {
    expect(shellLinks(shellConfigSchema.parse({}))).toEqual({
      navigation: [],
      account: { label: "Login", to: "/login" },
    });
  });

  test("configured entries become sidebar items and the account link replaces the login button", () => {
    expect(
      shellLinks(
        shellConfigSchema.parse({
          navigation: [
            { label: "Startseite", href: "/" },
            { label: "Roadmap", href: "/roadmap" },
          ],
          account: { label: "Lehrer", href: "/courses" },
        }),
      ),
    ).toEqual({
      navigation: [
        { id: "shell-0", label: "Startseite", to: "/" },
        { id: "shell-1", label: "Roadmap", to: "/roadmap" },
      ],
      account: { label: "Lehrer", to: "/courses" },
    });
  });
});
