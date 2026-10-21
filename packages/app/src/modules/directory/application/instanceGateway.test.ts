import { describe, expect, test } from "bun:test";
import type { SessionState } from "./gateway";
import { createInstanceGateway } from "./instanceGateway";

const A = "https://a.studyluma.org";
const B = "https://b.studyluma.org";

const normalizeCode = (input: string) =>
  /^[A-Z0-9]{4}$/.test(input.toUpperCase()) ? input.toUpperCase() : null;

/** Instances answering from a table of `url code` → state; anything else is gone. */
function gatewayWith(live: Record<string, SessionState>) {
  const asked: string[] = [];
  const gateway = createInstanceGateway({
    instances: [A, `${B}/`],
    normalizeCode,
    sessionState: async (url, code) => {
      asked.push(`${url} ${code}`);
      return live[`${url} ${code}`] ?? "gone";
    },
  });
  return { gateway, asked };
}

describe("instance gateway", () => {
  test("finds the instance that runs a code, case-insensitively", async () => {
    const { gateway } = gatewayWith({ [`${B} A3CD`]: "live" });
    expect(await gateway.find("a3cd")).toEqual({
      code: "A3CD",
      instanceUrl: B,
    });
    expect(await gateway.find("XXXX")).toBeNull();
  });

  test("asks nobody about a malformed code", async () => {
    const { gateway, asked } = gatewayWith({});
    expect(await gateway.find("no")).toBeNull();
    expect(asked).toEqual([]);
  });

  test("a registration needs the code live there and nowhere else", async () => {
    const { gateway } = gatewayWith({
      [`${A} A3CD`]: "live",
      [`${A} C4DE`]: "live",
      [`${B} C4DE`]: "live",
      [`${A} D6EF`]: "unknown",
    });
    expect(await gateway.register("A3CD", A)).toBe(204);
    expect(await gateway.register("C4DE", A)).toBe(409);
    expect(await gateway.register("E7FG", A)).toBe(403);
    expect(await gateway.register("D6EF", A)).toBe(503);
  });

  test("rejects instances it does not know and malformed input", async () => {
    const { gateway, asked } = gatewayWith({});
    expect(await gateway.register("A3CD", "https://x.studyluma.org")).toBe(400);
    expect(await gateway.register("A3CD", `${A}/path`)).toBe(400);
    expect(await gateway.register("no", A)).toBe(400);
    expect(asked).toEqual([]);
  });
});
