import { createCoursePlanSchema, type CoursePlan } from "@schema/coursePlan";
import { GroupsAndSubjects, groupsAndSubjectsSchema } from "@schema/groupsAndSubjects";
import { TopicPlan, topicPlanSchema } from "@schema/topicPlan";
import yaml from "yaml";
import { ZodError, type ZodType } from "zod";
import { globContent, readContentFile } from "./io";

export type LoadedContent = {
  groupsAndSubjects: GroupsAndSubjects;
  topics: Record<string, TopicPlan>;
  courses: CoursePlan[];
};

export async function loadContent(): Promise<LoadedContent> {
  const groupsAndSubjects = await loadGroupsAndSubjects();
  const topics = await loadTopicPlans();
  const courses = await loadCoursePlans(groupsAndSubjects);

  return { groupsAndSubjects, topics, courses };
}

async function parseYamlAndValidate<T>(
  relativePath: string,
  schema: ZodType<T>
): Promise<T> {
  const text = await readContentFile(relativePath);

  try {
    const raw = yaml.parse(text);
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      err.message = `Error in file: ${relativePath}\n${err.message}`;
    }
    throw err;
  }
}

async function loadGroupsAndSubjects(): Promise<GroupsAndSubjects> {
  return parseYamlAndValidate("groupsAndSubjects.yml", groupsAndSubjectsSchema);
}

async function loadTopicPlans(): Promise<Record<string, TopicPlan>> {
  const res: Record<string, TopicPlan> = {};

  for await (const relPath of globContent("base/*/*/topicPlan.yml")) {
    const parsed = await parseYamlAndValidate(relPath, topicPlanSchema);

    const folderPath = relPath.substring(0, relPath.lastIndexOf("/"));
    const id = folderPath.substring(folderPath.lastIndexOf("/") + 1);

    res[id] = parsed;
  }

  return res;
}

async function loadCoursePlans(
  groupsAndSubjects: GroupsAndSubjects
): Promise<CoursePlan[]> {
  const res: CoursePlan[] = [];
  const courseSchema = createCoursePlanSchema(groupsAndSubjects);

  for await (const relPath of globContent("courses/*/*/coursePlan.yml")) {
    const parsed = await parseYamlAndValidate(relPath, courseSchema);
    res.push(parsed);
  }

  return res;
}
