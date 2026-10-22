/**
 * The build side of a StudyLuma component: what its `index.ts` imports.
 * A component is a folder in the instance with two files that never meet:
 * `index.ts` (this API: name, keys, `compile`, the text for screen readers;
 * the compiler loads it, so it imports no React) and `view.tsx` (the view,
 * typed by `@studyluma/component-api/view`; the browser loads it, so it
 * imports no compile code).
 */
import type { Graphic, JsonValue } from "@studyluma/catalog-contract";

export type { Graphic, JsonValue };

/**
 * Where a component stands: `text` is chapter content, worksheets, tips and
 * ordinary slides (`::komponente`), `folie` a whole slide
 * (`::komponentenfolie`).
 */
export type Placement = "text" | "folie";
export const PLACEMENTS: readonly Placement[] = ["text", "folie"];

/**
 * The blocks of a Grafik file a component file may use when the component
 * sets `graphic`. They mean exactly what they mean in a Grafik file.
 */
export const GRAPHIC_BLOCKS = ["achsen", "graph", "parameter", "punkt"];

/** Lowercase letters, digits and hyphens, starting with a letter. */
export const COMPONENT_NAME = /^[a-z][a-z0-9-]*$/;

/** A component file as TOML gave it: the top-level keys and their values. */
export type ComponentFile = Readonly<Record<string, unknown>>;

/** What the compiler hands to `compile`. */
export type CompileContext = Readonly<{
  /** Where this use of the component stands. */
  placement: Placement;
  /**
   * The Grafik blocks of the file (`[achsen]`, `[[graph]]`, `[[parameter]]`,
   * `[[punkt]]`), read and checked like a Grafik file. Undefined when they
   * have errors; those are already reported.
   */
  graphic(file: ComponentFile): Graphic | undefined;
  /** Reports an error at the line of the directive; the build fails. */
  error(code: string, message: string): void;
  /** Reports a warning at the line of the directive. */
  warn(code: string, message: string): void;
}>;

export type ComponentDefinition<Props extends object = object> = Readonly<{
  name: string;
  /** Recorded in `catalog.meta.json`; raise it when the props change shape. */
  version: string;
  placements: readonly Placement[];
  /** The component's own top-level keys; any other key is an error. */
  keys: readonly string[];
  /** Whether the file may use the Grafik blocks (`GRAPHIC_BLOCKS`). */
  graphic: boolean;
  /**
   * Turns the file into the props of the view: plain JSON, written into the
   * catalog unchanged. Undefined after reporting errors.
   */
  compile(file: ComponentFile, context: CompileContext): Props | undefined;
  /** What a screen reader says for the component. */
  description(props: Props): string;
}>;

export type ComponentInput<Props extends object> = Readonly<{
  name: string;
  version?: string;
  placements: readonly Placement[];
  keys?: readonly string[];
  graphic?: boolean;
  compile(file: ComponentFile, context: CompileContext): Props | undefined;
  description(props: Props): string;
}>;

/** What is wrong with a component definition; empty when it is usable. */
export function componentProblems(value: unknown): string[] {
  if (typeof value !== "object" || value === null) {
    return ["must be an object from defineComponent"];
  }
  const input = value as Record<string, unknown>;
  const problems: string[] = [];
  if (typeof input.name !== "string" || !COMPONENT_NAME.test(input.name)) {
    problems.push(
      "name must be lowercase letters, digits and hyphens, starting with a letter",
    );
  }
  if (
    input.version !== undefined &&
    (typeof input.version !== "string" || !input.version)
  ) {
    problems.push("version must be a non-empty text");
  }
  const placements = input.placements;
  if (
    !Array.isArray(placements) ||
    !placements.length ||
    placements.some((placement) => !PLACEMENTS.includes(placement))
  ) {
    problems.push(`placements must list some of ${PLACEMENTS.join(", ")}`);
  }
  const keys = input.keys;
  if (
    keys !== undefined &&
    (!Array.isArray(keys) ||
      keys.some((key) => typeof key !== "string" || !key))
  ) {
    problems.push("keys must be a list of key names");
  } else if (Array.isArray(keys)) {
    for (const key of keys.filter((key) => GRAPHIC_BLOCKS.includes(key))) {
      problems.push(
        `keys must not name the Grafik block ${key}; set graphic instead`,
      );
    }
  }
  if (input.graphic !== undefined && typeof input.graphic !== "boolean") {
    problems.push("graphic must be true or false");
  }
  if (typeof input.compile !== "function") {
    problems.push("compile must be a function");
  }
  if (typeof input.description !== "function") {
    problems.push("description must be a function");
  }
  return problems;
}

/**
 * Declares a component. Default-export the result from the component's
 * `index.ts`. Throws when the definition is unusable.
 */
export function defineComponent<Props extends object>(
  input: ComponentInput<Props>,
): ComponentDefinition<Props> {
  const problems = componentProblems(input);
  if (problems.length) {
    throw new Error(
      `Invalid component ${String(input.name)}: ${problems.join("; ")}`,
    );
  }
  return Object.freeze({
    name: input.name,
    version: input.version ?? "1",
    placements: Object.freeze([...input.placements]),
    keys: Object.freeze([...(input.keys ?? [])]),
    graphic: input.graphic ?? false,
    compile: input.compile,
    description: input.description,
  });
}
