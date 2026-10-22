/**
 * The components an instance activates (`config/components.toml`), loaded
 * for the build: each entry is a folder `src/components/<name>/` of the instance
 * whose `index.ts` default-exports `defineComponent(...)`. Only `index.ts` is
 * loaded; the view never enters the build.
 */
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  componentProblems,
  type ComponentDefinition,
} from "@studyluma/component-api";
import type { ConfigByModule } from "./catalog-config";

/** An entry of `components`: `./src/components/<name>`. */
export const COMPONENT_ENTRY = /^\.\/src\/components\/([a-z][a-z0-9-]*)$/;

/**
 * The component folders the instance activates, as the app's `components`
 * module validated them. An instance without `config/components.toml`
 * activates none.
 */
export function componentEntries(config: ConfigByModule): string[] {
  const value = config.components;
  if (value === undefined) return [];
  const entries = (value as { components?: unknown } | null)?.components;
  if (
    !Array.isArray(entries) ||
    entries.some((entry) => typeof entry !== "string")
  ) {
    throw new Error("config/components.toml: components must list folders");
  }
  for (const entry of entries as string[]) {
    if (!COMPONENT_ENTRY.test(entry)) {
      throw new Error(
        `config/components.toml: ${entry} is not a folder ./src/components/<name>`,
      );
    }
  }
  return entries as string[];
}

/**
 * Loads the definitions of the listed components. Every problem (a missing
 * `index.ts`, an invalid definition, a name that is not the folder name, a
 * name used twice) is collected; any problem fails the build.
 */
export async function loadComponents(
  instanceRoot: string,
  entries: readonly string[],
): Promise<ComponentDefinition[]> {
  const problems: string[] = [];
  const loaded: ComponentDefinition[] = [];
  for (const entry of entries) {
    const folder = resolve(instanceRoot, entry);
    const file = join(folder, "index.ts");
    if (!existsSync(file)) {
      problems.push(`${entry}: index.ts is missing`);
      continue;
    }
    let definition: unknown;
    try {
      definition = (
        (await import(pathToFileURL(file).href)) as {
          default?: unknown;
        }
      ).default;
    } catch (error) {
      problems.push(
        `${entry}: index.ts does not load: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    const invalid = componentProblems(definition);
    if (invalid.length) {
      problems.push(
        `${entry}: index.ts must default-export defineComponent(...): ${invalid.join("; ")}`,
      );
      continue;
    }
    const component = definition as ComponentDefinition;
    if (component.name !== basename(folder)) {
      problems.push(
        `${entry}: the component is named ${component.name}; name and folder must match`,
      );
    } else if (loaded.some((other) => other.name === component.name)) {
      problems.push(
        `${entry}: the component ${component.name} is listed twice`,
      );
    } else {
      loaded.push(component);
    }
  }
  if (problems.length) {
    throw new Error(
      `config/components.toml:\n${problems.map((p) => `- ${p}`).join("\n")}`,
    );
  }
  return loaded;
}

/** Why `value` cannot travel as JSON unchanged; undefined when it can. */
export function jsonProblem(
  value: unknown,
  where = "props",
): string | undefined {
  if (value === null || ["string", "boolean"].includes(typeof value)) {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? undefined
      : `${where} is not a finite number`;
  }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const problem = jsonProblem(item, `${where}[${index}]`);
      if (problem) return problem;
    }
    return undefined;
  }
  if (
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    for (const [key, child] of Object.entries(value)) {
      if (child === undefined) continue;
      const problem = jsonProblem(child, `${where}.${key}`);
      if (problem) return problem;
    }
    return undefined;
  }
  return `${where} is not plain JSON data`;
}
