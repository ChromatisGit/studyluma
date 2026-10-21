import { describe, expect, test } from "bun:test";
import { createBunRuntimeHost } from "@chromatis/base/stateful/bun";
import { buildId, serveSiteFixture } from "../src/test/site";
import {
  classroomDefinitions,
  configureClassroom,
} from "../src/modules/classroom/server/classroom.server";
import { defaultClassroomSettings } from "../src/modules/classroom/infrastructure/classroomConfig";
import { loadCatalog, loadSite } from "./site.server";

serveSiteFixture();

const student = (cookie = "") =>
  new Request("http://site/courses", {
    headers: { cookie: `studyluma-viewer=student${cookie}` },
  });
/** The Inhalt the reader of this request receives for the fixture chapter. */
const summaryOf = async (request: Request) =>
  (await loadCatalog(request, ["c1"])).summaries[0]?.content ?? [];
const cookieOf = (auth: { code: string; token: string }) =>
  `; studyluma-classroom=${auth.code}.${auth.token}`;

describe("released content follows the Classroom Session", () => {
  test("without a session nothing is released", async () => {
    configureClassroom(
      createBunRuntimeHost(classroomDefinitions(defaultClassroomSettings)),
      defaultClassroomSettings,
    );
    const request = student();
    const site = await loadSite(request);
    expect(site.classroom).toBeNull();
    expect(await summaryOf(request)).toHaveLength(0);
    expect(site.releasedSolutions).toEqual([]);
  });

  test("a participant sees what the controller released, nothing before", async () => {
    const service = configureClassroom(
      createBunRuntimeHost(classroomDefinitions(defaultClassroomSettings)),
      defaultClassroomSettings,
    );
    const controller = await service.create({ buildId, title: "Test" });
    await service.act(controller, { type: "invite" });
    const joined = await service.join(controller.code, "Ada", "test");
    const beforeRequest = student(cookieOf(joined));
    const before = await loadSite(beforeRequest);
    expect(before.classroom).toMatchObject({ role: "participant" });
    expect(await summaryOf(beforeRequest)).toHaveLength(0);

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
    const afterRequest = student(cookieOf(joined));
    const after = await loadSite(afterRequest);
    expect(await summaryOf(afterRequest)).toHaveLength(1);
    expect(after.releasedSummaries).toEqual(["c1"]);
    expect(after.releasedSolutions).toEqual(["t2"]);

    // Another browser, without the credential, still sees nothing.
    expect(await summaryOf(student())).toHaveLength(0);

    await service.act(controller, { type: "end" });
    const ended = await loadSite(student(cookieOf(joined)));
    expect(ended.classroom).toBeNull();
    expect(ended.releasedSummaries).toEqual([]);
  });
});
