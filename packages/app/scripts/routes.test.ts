import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { manifestSchema, type RouteDeclaration } from "@chromatis/base/module";
import { normalizeJoinCode } from "../src/modules/classroom/domain/joinCode";
import { buildManifest } from "./generate-manifest";

const packageRoot = resolve(import.meta.dir, "..");
const manifest = manifestSchema.parse(
  JSON.parse(await buildManifest(packageRoot)),
);

type Flat = { owner: string; id: string; url: string | undefined };

/** Every declared route with its URL, layouts looked through. */
function flatten(
  owner: string,
  routes: readonly RouteDeclaration[],
  parent = "",
): Flat[] {
  return routes.flatMap((route) => {
    const url = route.layout
      ? parent
      : `${parent}/${route.path ?? ""}`.replace(/\/$/, "");
    return [
      {
        owner,
        id:
          route.id ??
          `routes/${route.file
            .split("/")
            .pop()
            ?.replace(/\.\w+$/, "")}`,
        url: route.layout ? undefined : url || "/",
      },
      ...flatten(owner, route.children ?? [], url),
    ];
  });
}

const product = flatten("app", manifest.app?.routes ?? []);
const byModule = (name: string) =>
  flatten(
    name,
    manifest.modules.find((module) => module.name === name)?.routes ?? [],
  );
const all = [...product, ...manifest.modules.flatMap((m) => byModule(m.name))];

describe("declared routes", () => {
  test("the app declares its root and the package-level routes", () => {
    expect(manifest.app?.root).toBe("@studyluma/app/app/root");
    const urls = product.map((route) => route.url);
    for (const url of ["/", "/login", "/courses", "/courses/:courseId"]) {
      expect(urls).toContain(url);
    }
    expect(urls).toContain("/api/check");
  });

  test("the classroom module owns the join, session and probe routes", () => {
    expect(byModule("classroom").map((route) => route.url)).toEqual([
      "/join",
      "/:code",
      "/classroom",
      "/.well-known/studyluma-session/:code",
    ]);
    const classroomUrls = new Set(byModule("classroom").map((r) => r.url));
    for (const route of product) {
      expect(classroomUrls.has(route.url)).toBe(false);
    }
  });

  test("route ids and URLs are unique across the package and its modules", () => {
    for (const key of ["id", "url"] as const) {
      const values = all.flatMap((route) =>
        route[key] === undefined ? [] : [route[key]],
      );
      expect(values.length).toBe(new Set(values).size);
    }
  });

  test("no static top-level route can be mistaken for a join code", () => {
    const fixed = all.flatMap((route) => {
      const segment = route.url?.split("/")[1] ?? "";
      return segment === "" || segment.startsWith(":") ? [] : [segment];
    });
    expect(fixed.length).toBeGreaterThan(3);
    for (const segment of fixed) {
      expect(normalizeJoinCode(segment)).toBeNull();
    }
  });

  test("no file in public/ can be mistaken for a join code", () => {
    for (const name of readdirSync(join(packageRoot, "public"))) {
      expect(normalizeJoinCode(name)).toBeNull();
    }
  });
});
