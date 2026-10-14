import { describe, expect, test } from "bun:test";
import { localReleases } from "./localReleases";

describe("browser-local releases", () => {
  test("the default chapters are released until the visitor changes one, and stay when others change", () => {
    expect(localReleases.getSnapshot().summaries).toEqual([]);
    localReleases.setDefaults(["c1"]);
    expect(localReleases.getServerSnapshot().summaries).toEqual(["c1"]);
    expect(localReleases.getSnapshot().summaries).toEqual(["c1"]);
    localReleases.setSummary("c2", true);
    expect(localReleases.getSnapshot().summaries).toEqual(["c1", "c2"]);
    localReleases.setSummary("c1", false);
    expect(localReleases.getSnapshot().summaries).toEqual(["c2"]);
    // A saved choice wins over later defaults.
    localReleases.setDefaults(["c1", "c3"]);
    expect(localReleases.getSnapshot().summaries).toEqual(["c2"]);
    expect(localReleases.getServerSnapshot().summaries).toEqual(["c1", "c3"]);
  });
});
