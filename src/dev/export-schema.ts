import { mkdirSync, writeFileSync } from "node:fs";

import { yamlCoursePlanSchema } from "@schema/coursePlan";
import { resolve } from "node:path";
import { toJSONSchema } from "zod";
import { topicPlanSchema } from "@schema/topicPlan";
import { groupsAndSubjectsSchema } from "@schema/groupsAndSubjects";

const OUT_DIR = resolve(process.cwd(), ".vscode/.schema");

const SCHEMAS = [
  { name: 'groupsAndSubjects', schema: groupsAndSubjectsSchema},
  { name: 'coursePlan', schema: yamlCoursePlanSchema },
  { name: 'topicPlan', schema: topicPlanSchema }
]

mkdirSync(OUT_DIR, { recursive: true });

for (const { name, schema } of SCHEMAS) {
  const json = toJSONSchema(schema, { io: "input", });
  const outFile = resolve(OUT_DIR, `${name}.json`);
  writeFileSync(outFile, JSON.stringify(json, null, 2), "utf-8");
  console.log(`[export-schema] ${name} -> ${outFile} - OK`);
}
