import { mkdirSync, writeFileSync } from "node:fs";

import { YamlCoursePlanSchema } from "@schema/course-plan";
import { resolve } from "node:path";
import { toJSONSchema } from "zod";

const OUT_DIR = resolve(process.cwd(), ".vscode/.schema");

const SCHEMAS = [
  { name: 'course-plan', schema: YamlCoursePlanSchema }
]

mkdirSync(OUT_DIR, { recursive: true });

for (const { name, schema } of SCHEMAS) {
  const json = toJSONSchema(schema, { io: "input", });
  const outFile = resolve(OUT_DIR, `${name}.json`);
  writeFileSync(outFile, JSON.stringify(json, null, 2), "utf-8");
  console.log(`[export-schema] ${name} -> ${outFile} - OK`);
}
