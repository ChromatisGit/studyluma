import { defineModule, z } from "@chromatis/base/module";

/** A path inside the instance: relative, forward slashes, no `.` or `..`. */
const instancePath = z
  .string()
  .refine(
    (value) =>
      value !== "" &&
      !value.startsWith("/") &&
      !value.includes("\\") &&
      !/^[A-Za-z]:/.test(value) &&
      value.split("/").every((part) => ![".", "..", ""].includes(part)),
    { message: "must be a relative path inside the instance" },
  );

/**
 * `config/catalog.toml`. Which courses an instance publishes is its own
 * decision, so `courses` has no default and the file is required.
 */
const catalogConfigSchema = z
  .object({
    /** The authoring sources the compiler reads. */
    content: instancePath
      .default("content")
      .describe("The authoring sources the compiler reads."),
    /** Course ids (`kurse/<id>.toml`) published by this instance. */
    courses: z
      .array(z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/))
      .min(1)
      .refine((courses) => new Set(courses).size === courses.length, {
        message: "must not list a course twice",
      })
      .describe("Course ids (kurse/<id>.toml) published by this instance."),
  })
  .strict();

/**
 * The compiler (a build-time devDependency of the instance, never part of the
 * app) turns the instance's content into the catalog artifact; the contract
 * validates it. Both are resolved by Chromatis when the build runs.
 */
export default defineModule({
  name: "catalog",
  config: { schema: catalogConfigSchema, required: true },
  contributions: [
    { id: "catalog", module: "@studyluma/compiler/contribution" },
  ],
  authoredFiles: [{ module: "@studyluma/compiler/authored-files" }],
  artifacts: [
    {
      id: "catalog",
      path: "catalog",
      validator: {
        module: "@studyluma/catalog-contract/validate",
        export: "validateCatalogArtifact",
      },
    },
  ],
});
