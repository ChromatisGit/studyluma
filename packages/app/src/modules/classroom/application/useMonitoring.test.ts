import { describe, expect, test } from "bun:test";
import { monitoringFrom } from "./useMonitoring";

describe("monitoringFrom", () => {
  test("nothing reported is an honest empty class", () => {
    const empty = monitoringFrom("s1", 5, 3, undefined);
    expect(empty).toMatchObject({
      registered: 5,
      working: 0,
      done: 0,
      sections: [0, 0, 0],
      challenges: 0,
    });
    expect(empty.ampel).toMatchObject({ answered: 0, total: 5 });
  });

  test("a section counts everyone who got that far", () => {
    const totals = {
      working: 3,
      done: 1,
      challenges: 0,
      reached: [1, 0, 2],
      ampel: {
        answered: 0,
        levels: { green: 0, yellow: 0, red: 0 },
        causes: {},
      },
    };
    expect(monitoringFrom("s1", 4, 3, totals).sections).toEqual([3, 2, 2]);
    // A report may name a section the sheet no longer has.
    expect(
      monitoringFrom("s1", 4, 2, { ...totals, reached: [0, 0, 0, 1] }).sections,
    ).toEqual([1, 1]);
  });
});
