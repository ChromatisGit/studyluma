import { Glob } from "bun";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { rm } from "fs/promises";
import { resolve, dirname } from "path";
import type { ZodType } from "zod";
import {
  ContentError,
  ContentIssueError,
  applyContextToIssues,
  issueCatalog,
  issueFromYamlError,
  issuesFromZodError,
} from "./errorHandling";


const WEBSITE_ROOT = normalizeSlashes(`${import.meta.dir}/..`);
const SOURCE_PATH = resolveContentPath();
const EXPORT_PATH = joinPath(WEBSITE_ROOT, ".generated");

function resolveContentPath(): string {
  const envPath = process.env.CONTENT_PATH;
  if (envPath) {
    return isAbsolutePath(envPath)
      ? normalizeSlashes(envPath)
      : joinPath(WEBSITE_ROOT, envPath);
  }

  const candidates = [
    joinPath(WEBSITE_ROOT, "content"),
    joinPath(WEBSITE_ROOT, "..", "content"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function joinPath(...parts: string[]): string {
  const raw = parts.map(normalizeSlashes).join("/");
  const cleaned = raw.replace(/\/{2,}/g, "/");
  return raw.startsWith("//") ? `/${cleaned}` : cleaned;
}

function normalizeSlashes(input: string): string {
  return input.replace(/\\/g, "/");
}

function isAbsolutePath(input: string): boolean {
  return (
    /^[A-Za-z]:[\\/]/.test(input) ||
    input.startsWith("/") ||
    input.startsWith("\\\\")
  );
}

export async function readTypFile(filePath: string): Promise<string> {
  if (!filePath.toLowerCase().endsWith(".typ")) {
    throw new Error("Expected a .typ file path.");
  }

  const fullPath = joinPath(SOURCE_PATH, filePath);
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

export async function writeJSONFile(path: string, content: unknown): Promise<void> {
  const filePath = path.toLowerCase().endsWith(".json") ? path : `${path}.json`;
  const fullPath = joinPath(EXPORT_PATH, filePath);
  await Bun.write(fullPath, JSON.stringify(content), { createPath: true });
}

export async function writeSQLFile(path: string, content: string): Promise<void> {
  const filePath = path.toLowerCase().endsWith(".sql") ? path : `${path}.sql`;
  const fullPath = joinPath(".generatedScripts", filePath);
  await Bun.write(fullPath, content, { createPath: true });
}

export async function writeFile(fullPath: string, content: string): Promise<void> {
  await Bun.write(fullPath, content, { createPath: true });
}


export async function deleteGenerated() {
   return rm(EXPORT_PATH, { recursive: true, force: true });
}

const IMAGE_OUTPUT_DIR = joinPath(WEBSITE_ROOT, "public", "_content", "images");
const PROJECT_ROOT = joinPath(WEBSITE_ROOT, "..");

type ResolvedImage = { publicUrl: string; absolutePath: string };
const imageCache = new Map<string, ResolvedImage>();

export async function cleanImageOutput() {
  imageCache.clear();
  return rm(IMAGE_OUTPUT_DIR, { recursive: true, force: true });
}

export function resolveAndCopyContentImage(source: string, typFilePath: string): ResolvedImage {
  const cacheKey = `${source}::${typFilePath}`;
  const cached = imageCache.get(cacheKey);
  if (cached) return cached;

  const absolutePath = resolve(
    source.startsWith("/")
      ? joinPath(PROJECT_ROOT, source)
      : joinPath(SOURCE_PATH, typFilePath, "..", source)
  );

  if (!existsSync(absolutePath)) {
    throw new Error(`Image not found: "${source}" (resolved to ${absolutePath})`);
  }

  const outputRelPath = source.startsWith("/")
    ? source.slice(1)
    : joinPath(typFilePath, "..", source);

  const outputPath = resolve(joinPath(IMAGE_OUTPUT_DIR, outputRelPath));
  const outputDir = dirname(outputPath);

  mkdirSync(outputDir, { recursive: true });
  copyFileSync(absolutePath, outputPath);

  const result: ResolvedImage = {
    publicUrl: `/_content/images/${normalizeSlashes(outputRelPath)}`,
    absolutePath,
  };

  imageCache.set(cacheKey, result);
  return result;
}

export async function parseYamlAndValidate<T>(
  relativePath: string,
  schema: ZodType<T>
): Promise<T> {
  if (!relativePath.toLowerCase().endsWith(".yml")) {
    throw new Error("Expected a .yml file path.");
  }

  const fullPath = joinPath(SOURCE_PATH, relativePath);

  const text = await readFile(fullPath);

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

export function readFile(fullPath: string) {
  try {
    return Bun.file(fullPath).text();
  } catch (err) {
    throw new ContentIssueError({
      ...issueCatalog.fileReadFailed(),
      filePath: fullPath,
      cause: err,
    });
  }
}



export async function getFolderNames(filePath: string): Promise<string[]> {
  const rootPath = joinPath(SOURCE_PATH, filePath);
  const glob = new Glob("*");
  const folders: string[] = [];

  for await (const entry of glob.scan({ cwd: rootPath, onlyFiles: false })) {
    const stats = await Bun.file(joinPath(rootPath, entry)).stat();
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
  const rootPath = joinPath(SOURCE_PATH, filePath);
  const suffix = extension ? extension.replace(/^\./, "") : "";
  const pattern = suffix ? `*.${suffix}` : "*";
  const glob = new Glob(pattern);
  const files: string[] = [];

  for await (const entry of glob.scan({ cwd: rootPath, onlyFiles: true })) {
    files.push(entry);
  }

  return files;
}
