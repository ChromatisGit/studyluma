import "server-only";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".data");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFilePath(filename: string): string {
  return join(DATA_DIR, filename);
}

export function readJsonFile<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filePath = getFilePath(filename);

  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }

  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
}

export function writeJsonFile<T>(filename: string, data: T): void {
  ensureDataDir();
  const filePath = getFilePath(filename);
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}
