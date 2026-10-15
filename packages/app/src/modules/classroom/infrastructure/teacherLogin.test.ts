import { afterEach, describe, expect, test } from "bun:test";
import {
  clearTeacherCookie,
  configureTeacherPassword,
  hasTeacherCookie,
  passwordMatches,
  teacherCookie,
  teacherPassword,
} from "./teacherLogin";
import { readViewer } from "./viewerCookie";

const request = (cookie = "", url = "http://site/courses") =>
  new Request(url, { headers: cookie ? { cookie } : {} });

/** The `name=value` part of a Set-Cookie header, as a browser sends it back. */
const sent = (setCookie: string) => setCookie.split(";")[0] ?? "";

afterEach(() => configureTeacherPassword(undefined));

describe("password", () => {
  test("only the exact password matches", async () => {
    expect(await passwordMatches("geheim", "geheim")).toBe(true);
    expect(await passwordMatches("geheim", "Geheim")).toBe(false);
    expect(await passwordMatches("geheim", "")).toBe(false);
    expect(await passwordMatches("geheim", "geheim ")).toBe(false);
  });

  test("an unset or empty password means the instance has none", () => {
    configureTeacherPassword("");
    expect(teacherPassword()).toBeUndefined();
    configureTeacherPassword("geheim");
    expect(teacherPassword()).toBe("geheim");
  });
});

describe("teacher cookie", () => {
  test("a freshly signed cookie is accepted", async () => {
    const cookie = sent(await teacherCookie(request(), "geheim"));
    expect(await hasTeacherCookie(request(cookie), "geheim")).toBe(true);
  });

  test("a cookie signed with another password is rejected", async () => {
    const cookie = sent(await teacherCookie(request(), "geheim"));
    expect(await hasTeacherCookie(request(cookie), "anders")).toBe(false);
  });

  test("a tampered expiry is rejected", async () => {
    const cookie = sent(await teacherCookie(request(), "geheim"));
    const [name = "", value = ""] = cookie.split("=");
    const [expires = "", signature = ""] = value.split(".");
    const forged = `${name}=${Number(expires) + 1_000_000}.${signature}`;
    expect(await hasTeacherCookie(request(forged), "geheim")).toBe(false);
  });

  test("an expired cookie is rejected", async () => {
    const cookie = sent(
      await teacherCookie(request(), "geheim", Date.now() - 8 * 86_400_000),
    );
    expect(await hasTeacherCookie(request(cookie), "geheim")).toBe(false);
  });

  test("garbage and a missing cookie are rejected", async () => {
    expect(await hasTeacherCookie(request(), "geheim")).toBe(false);
    for (const value of ["", "x", "1.", ".x", "abc.def", "99999999999.***"]) {
      expect(
        await hasTeacherCookie(request(`studyluma-teacher=${value}`), "geheim"),
      ).toBe(false);
    }
  });

  test("the cookie is HttpOnly and Secure only over https", async () => {
    const http = await teacherCookie(request(), "geheim");
    expect(http).toContain("HttpOnly");
    expect(http).not.toContain("Secure");
    const https = await teacherCookie(
      request("", "https://site/login"),
      "geheim",
    );
    expect(https).toContain("Secure");
    expect(clearTeacherCookie(request())).toContain("Max-Age=0");
  });
});

describe("readViewer", () => {
  test("without a password the stand-in cookie decides and the default is teacher", async () => {
    expect(await readViewer(request())).toBe("teacher");
    expect(await readViewer(request("studyluma-viewer=student"))).toBe(
      "student",
    );
  });

  test("with a password everybody is a student until they log in", async () => {
    configureTeacherPassword("geheim");
    expect(await readViewer(request())).toBe("student");
    // The stand-in cookie no longer grants anything.
    expect(await readViewer(request("studyluma-viewer=teacher"))).toBe(
      "student",
    );
    const cookie = sent(await teacherCookie(request(), "geheim"));
    expect(await readViewer(request(cookie))).toBe("teacher");
  });

  test("changing the password signs the teacher out", async () => {
    configureTeacherPassword("geheim");
    const cookie = sent(await teacherCookie(request(), "geheim"));
    configureTeacherPassword("neu");
    expect(await readViewer(request(cookie))).toBe("student");
  });
});
