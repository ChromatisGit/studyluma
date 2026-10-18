import { describe, expect, test } from "bun:test";
import { sheetRedirect, type SheetRedirectInput } from "./redirect";

const base: SheetRedirectInput = {
  sendId: "send-1",
  seen: [],
  quizRunning: false,
  path: "/courses/k/chapters/c/sheets/s",
  pathname: "/courses/k",
};

describe("sheetRedirect", () => {
  test("a new send leads the student to the sheet once", () => {
    expect(sheetRedirect(base)).toEqual({
      remember: true,
      navigateTo: base.path,
    });
  });

  test("a send already followed is not followed again", () => {
    expect(sheetRedirect({ ...base, seen: ["send-1"] })).toEqual({
      remember: false,
      navigateTo: null,
    });
  });

  test("a re-send of the same sheet has a new id and is followed", () => {
    expect(
      sheetRedirect({ ...base, sendId: "send-2", seen: ["send-1"] }),
    ).toEqual({ remember: true, navigateTo: base.path });
  });

  test("nothing sent, nothing to do", () => {
    expect(sheetRedirect({ ...base, sendId: null })).toEqual({
      remember: false,
      navigateTo: null,
    });
  });

  test("a running quiz is not interrupted, and the send is skipped for good", () => {
    expect(sheetRedirect({ ...base, quizRunning: true })).toEqual({
      remember: true,
      navigateTo: null,
    });
  });

  test("a sheet whose place is not known yet waits", () => {
    expect(sheetRedirect({ ...base, path: null })).toEqual({
      remember: false,
      navigateTo: null,
    });
  });

  test("a student already on the sheet stays, and the send counts as seen", () => {
    expect(sheetRedirect({ ...base, pathname: base.path ?? "" })).toEqual({
      remember: true,
      navigateTo: null,
    });
  });
});
