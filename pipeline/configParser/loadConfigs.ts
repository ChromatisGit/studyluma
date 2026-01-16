import { GroupDefinitions, groupDefinitionsSchema } from "./schema/definitions";
import { CoursePlan, createCoursePlanSchema } from "./schema/coursePlan";
import { yamlCoursePlanSchema } from "./schema/yamlCoursePlan";
import { validateLucideIcons } from "./validateLucideIcons";
import { getFileNames, getFolderNames, parseYamlAndValidate } from "../io";
import { ContentError, applyContextToIssues, issuesFromZodError } from "../errorHandling";

export type LoadedConfigs = {
  definitions: GroupDefinitions;
  courses: CoursePlan[];
};

export async function loadConfigs(): Promise<CoursePlan[]> {
  const definitions = await parseYamlAndValidate("definitions.yml", groupDefinitionsSchema);
  const iconIssues = validateLucideIcons(definitions, []);
  if (iconIssues.length) {
    throw new ContentError(iconIssues, "Validation failed");
  }
  const courses = await loadCoursePlans(definitions);

  return courses;
}


async function loadCoursePlans(
  definitions: GroupDefinitions
): Promise<CoursePlan[]> {
  const res: CoursePlan[] = [];
  const principleFiles = await getFileNames("principles", "typ");
  const principleNames = new Set(
    principleFiles.map((name) => name.replace(/\.typ$/i, ""))
  );
  const courseSchema = createCoursePlanSchema(definitions, principleNames);

  const courseFolders = await getFolderNames("courses")

  for await (const folder of courseFolders) {
    const relativePath = `courses/${folder}/course.yml`;
    const filePath = `content/${relativePath}`;
    const raw = await parseYamlAndValidate(relativePath, yamlCoursePlanSchema);

    const parsed = courseSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = applyContextToIssues(issuesFromZodError(parsed.error), {
        filePath,
      });
      throw new ContentError(issues, "Validation failed");
    }

    parsed.data.courseFolder = folder;
    res.push(parsed.data);
  }

  return res;
}
