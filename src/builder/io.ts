import { CoursePlanSchema } from "@schema/coursePlan";
import type { CoursePlan } from "@schema/coursePlan";
import { TopicPlan, TopicPlanSchema } from "@schema/topicPlan";

import fs from 'node:fs/promises';
import path from "node:path";
import yaml from 'yaml';
import { z, ZodError } from "zod";

const CONTENT_DIR = "./content";
const OUT_DIR = "./website/.generated";

export async function deleteGeneratedWebsite() {
  const fullPath = path.resolve(OUT_DIR);

  try {
    await fs.rm(fullPath, {
      recursive: true,
      force: true,
    });
  } catch (err) {
    console.error('Error deleting folder:', err);
  }
}

export async function readAllTopics(): Promise<Record<string, TopicPlan>> {
  const root = path.resolve(CONTENT_DIR);
  const res: Record<string, TopicPlan> = {};

  for await (const relPath of fs.glob("base/*/*/topicPlan.yml", { cwd: root })) {
    const absPath = path.join(root, relPath);
    const rawText = await fs.readFile(absPath, "utf8");
    const raw = yaml.parse(rawText);

    try {
      const parsed = TopicPlanSchema.parse(raw);

      const folderPath = path.dirname(relPath);
      const id = path.basename(folderPath);

      res[id] = parsed;
    } catch (err) {
      if (err instanceof ZodError) {
        err.message = `Error in file: ${relPath}\n${err.message}`;
      }
      throw err;
    }
  }

  return res;
}

export async function readAllCourses(): Promise<CoursePlan[]> {
  const root = path.resolve(CONTENT_DIR);
  const res: CoursePlan[] = [];

  for await (const relPath of fs.glob("courses/*/*/coursePlan.yml", { cwd: root })) {
    const abs = path.join(root, relPath);
    const raw = yaml.parse(await fs.readFile(abs, "utf8"));

    try {
      res.push(CoursePlanSchema.parse(raw));
    } catch (err) {
      if (err instanceof ZodError) {
        err.message = `Error in file: ${relPath}\n${err.message}`;
      }
      throw err;
    }
  }

  return res;
}

export async function readFile(relativePath: string): Promise<string> {
  const abs = path.resolve(process.cwd(), CONTENT_DIR, relativePath);
  try {
    const content = await fs.readFile(abs, "utf8");
    return content;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      // For testing only TODO: Remove this and throw an error instead
      return ''
    } else {
      throw err;
    }
  }
}

export async function writeFile({ relativePath, content }: { relativePath: string, content: any }) {
  const abs = path.resolve(process.cwd(), OUT_DIR, relativePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf8');
}