import fs from "node:fs/promises";
import path from "node:path";

export const CONTENT_DIR = "./content";
export const OUT_DIR = "./website/.generated";
const IGNORE_MISSING_FILES =
  process.env.IGNORE_MISSING_FILES === "true" || process.env.IGNORE_MISSING_FILES === "1";

export async function deleteGeneratedWebsite() {
  const fullPath = path.resolve(OUT_DIR);

  try {
    await fs.rm(fullPath, {
      recursive: true,
      force: true,
    });
  } catch (err) {
    console.error("Error deleting folder:", err);
  }
}

export async function readContentFile(relativePath: string): Promise<string> {
  const abs = path.resolve(process.cwd(), CONTENT_DIR, relativePath);
  try {
    return await fs.readFile(abs, "utf8");
  } catch (err: any) {
    if (err.code === "ENOENT") {
      if (IGNORE_MISSING_FILES) {
        console.warn(`[builder] Missing content file ignored: ${relativePath}`);
        return "";
      }
      throw new Error(`Content file not found: ${relativePath}`);
    }
    throw err;
  }
}

export async function writeGeneratedFile(params: { relativePath: string; content: any }) {
  const abs = path.resolve(process.cwd(), OUT_DIR, params.relativePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, params.content, "utf8");
}

export async function* globContent(pattern: string): AsyncGenerator<string> {
  const root = path.resolve(process.cwd(), CONTENT_DIR);

  for await (const relPath of (fs as any).glob(pattern, { cwd: root })) {
    yield relPath as string;
  }
}