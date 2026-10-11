import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { injectChromatis } from "@chromatis/base/testing";
import { serveSiteFixture } from "../src/test/site";
import { loadSite } from "./site.server";
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
    expect(site.catalog.buildId).toBeDefined();
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
