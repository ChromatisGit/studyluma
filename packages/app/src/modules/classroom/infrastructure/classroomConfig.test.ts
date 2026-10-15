import { describe, expect, test } from "bun:test";
import { ConflictError, ValidationError } from "@chromatis/base/errors";
import { createBunRuntimeHost } from "@chromatis/base/stateful/bun";
import { injectChromatis } from "@chromatis/base/testing";
import { createClassroomService } from "../application/classroomService";
import { createClassroomRuntime } from "../runtime/classroomRuntime";
import {
  classroomConfigSchema,
  classroomSettingsFrom,
  defaultClassroomSettings,
} from "./classroomConfig";
import { classroomCookie } from "./classroomCookie";
import { classroomSettings } from "./classroomSettings";

describe("classroom configuration", () => {
  test("the defaults are what the classroom did before it was configurable", () => {
    expect(defaultClassroomSettings).toEqual({
      sessionTtlMs: 12 * 60 * 60 * 1000,
      maxParticipants: 120,
      maxNameLength: 40,
      maxSessions: 500,
      createLimit: { maxCreations: 60, windowMs: 600_000 },
      lookupLimit: { maxFailures: 20, windowMs: 60_000 },
    });
  });

  test("a partial file keeps the other defaults", () => {
    const config = classroomConfigSchema.parse({
      max_participants: 30,
      join_lookup_limit: { window_seconds: 10 },
    });
    expect(classroomSettingsFrom(config)).toMatchObject({
      sessionTtlMs: 12 * 60 * 60 * 1000,
      maxParticipants: 30,
      lookupLimit: { maxFailures: 20, windowMs: 10_000 },
    });
  });

  test("unknown keys and out-of-range values are rejected", () => {
    for (const bad of [
      { join_code_length: 6 },
      { join_lookup_limit: { max_failure: 3 } },
      { session_ttl_hours: 0 },
      { session_ttl_hours: 1.5 },
      { max_participants: "many" },
    ]) {
      expect(classroomConfigSchema.safeParse(bad).success).toBe(false);
    }
  });

  test("runtime code reads the configuration of the build", () => {
    const restore = injectChromatis({
      config: {
        classroom: classroomConfigSchema.parse({ session_ttl_hours: 2 }),
      },
    });
    try {
      expect(classroomSettings().sessionTtlMs).toBe(2 * 60 * 60 * 1000);
    } finally {
      restore();
    }
  });

  test("a build without classroom configuration is an error, not defaults", () => {
    const restore = injectChromatis({ config: {} });
    try {
      expect(() => classroomSettings()).toThrow(/No configuration/);
    } finally {
      restore();
    }
  });

  test("the cookie lives as long as it is told to", () => {
    const cookie = classroomCookie(
      new Request("http://site/"),
      { code: "ABCD", token: "t".repeat(32) },
      43200,
    );
    expect(cookie).toContain("Max-Age=43200;");
  });

  test("the runtime enforces the configured participant and name limits", async () => {
    const settings = {
      ...defaultClassroomSettings,
      maxParticipants: 1,
      maxNameLength: 3,
    };
    const service = createClassroomService(
      createBunRuntimeHost([createClassroomRuntime({ settings })]),
    );
    const session = await service.create({
      buildId: "b".repeat(64),
      title: "x",
    });
    await service.act(session, { type: "invite" });
    await expect(
      service.join(session.code, "Alice", "c"),
    ).rejects.toBeInstanceOf(ValidationError);
    await service.join(session.code, "Ada", "c");
    await expect(service.join(session.code, "Bob", "c")).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});
