import { defineModule, z } from "@chromatis/base/module";

/** A component folder of the instance: `./src/components/<name>`, the name in lowercase. */
const componentFolder = z
  .string()
  .regex(/^\.\/src\/components\/[a-z][a-z0-9-]*$/, {
    message: 'must be a component folder "./src/components/<name>"',
  });

/**
 * `config/components.toml`: the components this instance activates. Which
 * ones is the instance's decision, listed explicitly; without the file there
 * are none.
 */
export const componentsConfigSchema = z
  .object({
    components: z
      .array(componentFolder)
      .refine((folders) => new Set(folders).size === folders.length, {
        message: "must not list a component twice",
      })
      .default([])
      .describe(
        'The component folders this instance activates, such as "./src/components/symmetrie"; the folder name is the name authors write in ::komponente [name](…).',
      ),
  })
  .strict();

/**
 * Components: interactive building blocks an instance brings along. The
 * compiler loads each folder's `index.ts` during the catalog build; the
 * browser loads each `view.tsx` on demand.
 */
export default defineModule({
  name: "components",
  config: { schema: componentsConfigSchema },
});
