import { CoursePlanSchema } from "@schema/course-plan";
import type { CoursePlan, YamlCoursePlan } from "@schema/course-plan";

import fs from 'node:fs/promises';
import path from "node:path";
import yaml from 'yaml';

const BASE_DIR = "./content/base";
const COURSES_DIR = "./content/courses";
const OUT_DIR = "./website/.generated";


export async function readAllCourses() {
  const root = path.resolve(COURSES_DIR);
  const res: CoursePlan[] = [];

  for await (const progress_path of fs.glob('*/*/course-plan.yml', { cwd: root })) {
    const raw: YamlCoursePlan = yaml.parse(await fs.readFile(path.join(root, progress_path), "utf8"));
    res.push(CoursePlanSchema.parse(raw));
  }

  return res
}

export function writeConfig(configName: string, content: any) {
  const filePath = path.resolve(process.cwd(), OUT_DIR, `${configName}.config.json`);
  fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
}