import { describe, expect, test } from "bun:test";
import { createBunRuntimeHost } from "@chromatis/base/stateful/bun";
import { buildId, serveSiteFixture } from "../src/test/site";
import {
  classroomDefinitions,
  configureClassroom,
} from "../src/modules/classroom/server/classroom.server";
import { loadSite } from "./site.server";

serveSiteFixture();

const student = (cookie = "") =>
  new Request("http://site/courses", {
    headers: { cookie: `studyluma-viewer=student${cookie}` },
  });
const cookieOf = (auth: { code: string; token: string }) =>
  `; studyluma-classroom=${auth.code}.${auth.token}`;

describe("released content follows the Classroom Session", () => {
  test("without a session nothing is released", async () => {
    configureClassroom(createBunRuntimeHost(classroomDefinitions));
    const site = await loadSite(student());
    expect(site.classroom).toBeNull();
    expect(site.catalog.summaries[0]?.content ?? []).toHaveLength(0);
    expect(site.releasedSolutions).toEqual([]);
  });

  test("a participant sees what the controller released, nothing before", async () => {
    const service = configureClassroom(
      createBunRuntimeHost(classroomDefinitions),
    );
    const controller = await service.create({ buildId, title: "Test" });
    const joined = await service.join(controller.code, "Ada", "test");
    const before = await loadSite(student(cookieOf(joined)));
    expect(before.classroom).toMatchObject({ role: "participant" });
    expect(before.catalog.summaries[0]?.content ?? []).toHaveLength(0);

    await service.act(controller, {
      type: "release.summary",
      chapterId: "c1",
      released: true,
    });
    await service.act(controller, {
      type: "release.solutions",
      taskIds: ["t2"],
      released: true,
    });
    const after = await loadSite(student(cookieOf(joined)));
    expect(after.catalog.summaries[0]?.content).toHaveLength(1);
    expect(after.releasedSummaries).toEqual(["c1"]);
    expect(after.releasedSolutions).toEqual(["t2"]);

    // Another browser, without the credential, still sees nothing.
    const stranger = await loadSite(student());
    expect(stranger.catalog.summaries[0]?.content ?? []).toHaveLength(0);

    await service.act(controller, { type: "end" });
    const ended = await loadSite(student(cookieOf(joined)));
    expect(ended.classroom).toBeNull();
    expect(ended.releasedSummaries).toEqual([]);
  });
});
