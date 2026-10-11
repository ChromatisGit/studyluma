import { isAbsolute, relative } from "node:path";

/** Validated module configuration keyed by module name, as Chromatis passes it. */
export type ConfigByModule = Readonly<Record<string, unknown>>;

/** The instance's `config/catalog.toml` as the app's catalog module validates it. */
export type CatalogConfig = { content: string; courses: string[] };

export function catalogConfig(config: ConfigByModule): CatalogConfig {
  const value = config.catalog;
  const fail = (problem: string): never => {
    throw new Error(`config/catalog.toml: ${problem}`);
  };
  if (typeof value !== "object" || value === null) {
    return fail("missing (the catalog module has no validated configuration)");
  }
  const { content = "content", courses } = value as Record<string, unknown>;
  if (
    typeof content !== "string" ||
    content === "" ||
    isAbsolute(content) ||
    relative(".", content).startsWith("..")
  ) {
    return fail("content must be a path inside the instance");
  }
  if (
    !Array.isArray(courses) ||
    courses.length === 0 ||
    courses.some((id) => typeof id !== "string" || id === "")
  ) {
    return fail("courses must list the published course ids");
  }
  return { content, courses: courses as string[] };
}
