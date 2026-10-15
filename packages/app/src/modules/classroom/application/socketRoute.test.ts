import { describe, expect, test } from "bun:test";
import { handleClassroomSocket } from "./socketRoute";
import type { ClassroomService } from "./classroomService";

// The origin is checked before the service is ever asked.
const service = {} as ClassroomService;

const upgrade = (origin: string | null) =>
  new Request("https://site.example/classroom/ws", {
    headers: {
      upgrade: "websocket",
      ...(origin === null ? {} : { origin }),
    },
  });

describe("the classroom socket route", () => {
  test.each([
    ["another site", "https://evil.example"],
    ["a sandboxed frame", "null"],
    ["something that is no origin", "not a url"],
  ])("refuses %s with 403, not an error", async (_, origin) => {
    const response = await handleClassroomSocket(upgrade(origin), service);
    expect(response?.status).toBe(403);
  });

  test("lets this site through to the credential check", async () => {
    const same = await handleClassroomSocket(
      upgrade("https://site.example"),
      service,
    );
    expect(same?.status).toBe(401);
  });

  test("a request without an Origin is no cross-site page", async () => {
    const response = await handleClassroomSocket(upgrade(null), service);
    expect(response?.status).toBe(401);
  });
});
