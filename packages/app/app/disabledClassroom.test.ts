import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { injectChromatis } from "@chromatis/base/testing";
import { fixtureFiles, serveSiteFixture, source } from "../src/test/site";
import { provideCatalogFiles } from "../src/modules/catalog/server/catalog.server";
import { loadCatalog, loadSite } from "./site.server";
import { loader as quizLoader } from "./routes/quiz";

serveSiteFixture();

// An instance that disables the classroom module has no `classroom` entry in
// `chromatis-config`: nothing may read that configuration.
let restore: () => void;
beforeAll(() => {
  restore = injectChromatis({ config: {} });
});
afterAll(() => restore());

const request = (cookie: string) =>
  new Request("http://site/courses", { headers: { cookie } });

describe("without the classroom module", () => {
  test("pages load without any classroom configuration", async () => {
    const site = await loadSite(request("studyluma-viewer=teacher"));
    expect(site.classroomEnabled).toBe(false);
    expect(site.classroom).toBeNull();
    expect(site.joinOrigin).toBeNull();
    expect(site.index.buildId).toBeDefined();
  });

  test("a leftover classroom cookie is ignored", async () => {
    const site = await loadSite(
      request(
        `studyluma-viewer=student; studyluma-classroom=ABCD.${"t".repeat(40)}`,
      ),
    );
    expect(site.classroom).toBeNull();
    expect(site.summaryRules).toBeDefined();
  });

  test("the demo sends summary content for browser-local release controls", async () => {
    const student = request("studyluma-viewer=student");
    const site = await loadSite(student);
    expect(site.localReleases).toBe(true);
    expect(site.releasedSummaries).toEqual([]);
    const catalog = await loadCatalog(student, ["c1"]);
    expect(catalog.summaries[0]?.content).toHaveLength(1);
  });

  test("the demo starts with the Inhalt of each course's starting chapter released", async () => {
    provideCatalogFiles(
      fixtureFiles({
        ...source,
        topics: [{ id: "t1", group: "g", folder: "t", title: "Thema" }],
        courses: [
          {
            id: "k",
            title: "Kurs",
            topics: [{ topicId: "t1", chapterIds: ["c1"] }],
          },
        ],
      }),
    );
    try {
      const site = await loadSite(request("studyluma-viewer=teacher"));
      expect(site.defaultReleasedSummaries).toEqual(["c1"]);
      expect(site.releasedSummaries).toEqual(["c1"]);
    } finally {
      provideCatalogFiles(fixtureFiles());
    }
  });

  test("the live-quiz page does not exist", () => {
    try {
      quizLoader({
        params: { courseId: "c1" },
        request: request(""),
        context: {},
      } as never);
      throw new Error("expected a 404");
    } catch (error) {
      expect((error as Response).status).toBe(404);
    }
  });
});
