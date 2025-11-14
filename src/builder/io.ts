import { CoursePlanSchema } from "@schema/course-plan";
import type { CoursePlan, YamlCoursePlan } from "@schema/course-plan";

import fs from 'node:fs/promises';
import path from "node:path";
import yaml from 'yaml';

const CONTENT_DIR = "./content";
const OUT_DIR = "./website/.generated";


export async function readAllCourses() {
  const root = path.resolve(CONTENT_DIR);
  const res: CoursePlan[] = [];

  for await (const progress_path of fs.glob('courses/*/*/course-plan.yml', { cwd: root })) {
    const raw: YamlCoursePlan = yaml.parse(await fs.readFile(path.join(root, progress_path), "utf8"));
    res.push(CoursePlanSchema.parse(raw));
  }

  return res
}

export function writeConfig(configName: string, content: any) {
  const filePath = path.resolve(process.cwd(), OUT_DIR, `${configName}.config.json`);
  fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
}

export async function copyFile(source: string, target: string) {
  const sourcePath = path.resolve(process.cwd(), CONTENT_DIR, source);
  const targetPath = path.resolve(process.cwd(), OUT_DIR, target);

  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  try {
    await fs.copyFile(sourcePath, targetPath);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      // ToDo: Remove this and throw an error instead
      await fs.writeFile(targetPath, "");
    } else {
      throw err;
    }
  }
}

export function buildPage({relativePath, pageName, content}: {relativePath: string, pageName: string, content: any}) {
  const filePath = path.resolve(process.cwd(), OUT_DIR, relativePath, pageName);
  fs.writeFile(filePath, content, 'utf8');
}