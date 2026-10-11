import { afterEach, describe, expect, test } from "bun:test";
import { injectChromatis } from "@chromatis/base/testing";
import { shellConfigSchema } from "../domain/shellConfig";
import { shellSettings } from "./shell.server";

let restore: (() => void) | undefined;
afterEach(() => restore?.());

describe("shellSettings", () => {
  test("defaults apply when the module has no configuration entry", () => {
    restore = injectChromatis({ config: {} });
    expect(shellSettings()).toEqual({ navigation: [] });
  });

  test("reads the configuration of the build", () => {
    restore = injectChromatis({
      config: {
        shell: shellConfigSchema.parse({
          navigation: [{ label: "Startseite", href: "/" }],
          account: { label: "Lehrer", href: "/courses" },
        }),
      },
    });
    expect(shellSettings().account?.label).toBe("Lehrer");
    expect(shellSettings().navigation).toHaveLength(1);
  });
});
