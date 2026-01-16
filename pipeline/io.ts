import { Glob } from "bun";
import { rm } from "fs/promises";
import type { ZodType } from "zod";
import {
  ContentError,
  ContentIssueError,
  applyContextToIssues,
  issueCatalog,
  issueFromYamlError,
  issuesFromZodError,
} from "./errorHandling";


const SOURCE_PATH = "content"
const EXPORT_PATH = ".generated"

export async function readTypFile(filePath: string): Promise<string> {
  if (!filePath.toLowerCase().endsWith(".typ")) {
    throw new Error("Expected a .typ file path.");
  }

  const fullPath = `${SOURCE_PATH}/${filePath}`;
  try {
    return await Bun.file(fullPath).text();
  } catch (err) {
    throw new ContentIssueError({
      ...issueCatalog.fileReadFailed(),
      filePath: fullPath,
      cause: err,
    });
  }
}

export function writeJSONFile(path: string, content: unknown) {
  const filePath = path.toLowerCase().endsWith(".json") ? path : `${path}.json`;
  const fullPath = `${EXPORT_PATH}/${filePath}`;
  void Bun.write(fullPath, JSON.stringify(content), { createPath: true });
}

export async function deleteGenerated() {
   return rm(EXPORT_PATH, { recursive: true, force: true });
}

export async function parseYamlAndValidate<T>(
  relativePath: string,
  schema: ZodType<T>
): Promise<T> {
  if (!relativePath.toLowerCase().endsWith(".yml")) {
    throw new Error("Expected a .yml file path.");
  }

  const fullPath = `${SOURCE_PATH}/${relativePath}`;

  let text: string;
  try {
    text = await Bun.file(fullPath).text();
  } catch (err) {
    throw new ContentIssueError({
      ...issueCatalog.fileReadFailed(),
      filePath: fullPath,
      cause: err,
    });
  }

  let raw: unknown;
  try {
    raw = Bun.YAML.parse(text);
  } catch (err) {
    throw new ContentIssueError({
      ...issueFromYamlError(err),
      filePath: fullPath,
    });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = applyContextToIssues(issuesFromZodError(parsed.error), {
      filePath: fullPath,
    });
    throw new ContentError(issues, "Validation failed");
  }

  return parsed.data;
}



export async function getFolderNames(filePath: string): Promise<string[]> {
  const rootPath = `${SOURCE_PATH}/${filePath}`;
  const glob = new Glob("*");
  const folders: string[] = [];

  for await (const entry of glob.scan({ cwd: rootPath, onlyFiles: false })) {
    const stats = await Bun.file(`${rootPath}/${entry}`).stat();
    if (stats.isDirectory()) {
      folders.push(entry);
    }
  }

  return folders;
}

export async function getFileNames(
  filePath: string,
  extension?: string
): Promise<string[]> {
  const rootPath = `${SOURCE_PATH}/${filePath}`;
  const suffix = extension ? extension.replace(/^\./, "") : "";
  const pattern = suffix ? `*.${suffix}` : "*";
  const glob = new Glob(pattern);
  const files: string[] = [];

  for await (const entry of glob.scan({ cwd: rootPath, onlyFiles: true })) {
    files.push(entry);
  }

  return files;
}
