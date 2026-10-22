import type { Catalog } from "./types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * The names of the components a catalog uses, sorted and once each: every
 * `component` node in its content and every `componentSlide`. The props a
 * component wrote are not searched; they are its own data.
 */
export function componentsIn(catalog: Omit<Catalog, "buildId">): string[] {
  const names = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isObject(value)) {
      return;
    }
    if (value.type === "component" && typeof value.name === "string") {
      names.add(value.name);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (
        key === "componentSlide" &&
        isObject(child) &&
        typeof child.name === "string"
      ) {
        names.add(child.name);
      } else {
        visit(child);
      }
    }
  };
  visit(catalog);
  return [...names].sort();
}
