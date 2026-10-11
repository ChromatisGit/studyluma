/**
 * The TOML files an author writes in the content root and the schema each one
 * follows, so editors can complete and validate them (declared by the app's
 * `catalog` module; run by `chromatis init` and `chromatis fix`). The schemas
 * are the ones the compiler validates with. The types are structural so this
 * package imports nothing from Chromatis.
 */
import type { z } from "zod";
import { catalogConfig, type ConfigByModule } from "./catalog-config";
import { courseSchema, definitionsSchema, topicSchema } from "./config";
import { graphicSchema } from "./graphic";

/** The argument Chromatis passes to every authored-files function. */
export type AuthoredFilesContext = Readonly<{
  instanceRoot: string;
  environment: string;
  /** Validated module configuration keyed by module name. */
  config: ConfigByModule;
}>;

/** Files matching `include` are written following `schema`. */
export type AuthoredFileSchema = Readonly<{
  name: string;
  include: string | readonly string[];
  schema: z.ZodType;
}>;

/**
 * Specific files first: Chromatis gives each file the first association that
 * matches it, and every other TOML file in the content root is a Grafik.
 */
export default function authoredFiles(
  context: AuthoredFilesContext,
): AuthoredFileSchema[] {
  const { content } = catalogConfig(context.config);
  return [
    {
      name: "definitions",
      include: `${content}/definitions.toml`,
      schema: definitionsSchema,
    },
    {
      name: "course",
      include: `${content}/kurse/*.toml`,
      schema: courseSchema,
    },
    {
      name: "topic",
      include: `${content}/*/*/thema.toml`,
      schema: topicSchema,
    },
    { name: "graphic", include: `${content}/**/*.toml`, schema: graphicSchema },
  ];
}
